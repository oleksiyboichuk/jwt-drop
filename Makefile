AWS_PROFILE ?= default
AWS_REGION  ?= eu-central-1
AWS_ACCOUNT := $(shell aws sts get-caller-identity --profile $(AWS_PROFILE) --query Account --output text 2>/dev/null || echo "000000000000")
ECR_REPO    := $(AWS_ACCOUNT).dkr.ecr.$(AWS_REGION).amazonaws.com/jwt-drop/application-service
IMAGE_TAG   ?= latest

export AWS_PROFILE
export AWS_REGION
export TF_VAR_aws_profile := $(AWS_PROFILE)
export TF_VAR_aws_region  := $(AWS_REGION)

.PHONY: help keys build push deploy destroy logs clean run-local

help:
	@echo ""
	@echo "  jwt-drop — available commands:"
	@echo "    make keys      - Generate RSA 2048-bit key pair (if missing)"
	@echo "    make build     - Bundle Lambda and build Docker container"
	@echo "    make push      - Push Docker image to ECR"
	@echo "    make deploy    - Full deployment to AWS via Terraform"
	@echo "    make destroy   - Tear down all AWS resources"
	@echo "    make run-local - Run Application Service locally (connects to AWS SNS if deployed)"
	@echo "    make logs      - Tail ECS container logs from CloudWatch"
	@echo "    make clean     - Remove local build artifacts"
	@echo ""

keys:
	@mkdir -p keys
	@if [ ! -f keys/private.key ] || [ ! -f keys/public.key ]; then \
		echo "==> Generating RSA key pair in keys/..."; \
		openssl genrsa -out keys/private.key 2048 2>/dev/null; \
		openssl rsa -in keys/private.key -pubout -out keys/public.key 2>/dev/null; \
		echo "==> Keys generated successfully."; \
	fi

build: keys
	npm run build --workspace=@jwt-drop/session-manager
	docker build --platform linux/amd64 -f services/application-service/Dockerfile -t jwt-drop-app:$(IMAGE_TAG) .

push: build
	aws ecr get-login-password --region $(AWS_REGION) --profile $(AWS_PROFILE) | \
		docker login --username AWS --password-stdin $(AWS_ACCOUNT).dkr.ecr.$(AWS_REGION).amazonaws.com
	docker tag jwt-drop-app:$(IMAGE_TAG) $(ECR_REPO):$(IMAGE_TAG)
	docker push $(ECR_REPO):$(IMAGE_TAG)

deploy: keys
	npm run build --workspace=@jwt-drop/session-manager
	cd terraform && terraform init
	cd terraform && terraform apply -target=aws_ecr_repository.app_service -auto-approve
	$(MAKE) push
	cd terraform && terraform apply -auto-approve
	@echo "==> Deployment complete!"
	@cd terraform && terraform output

destroy:
	cd terraform && terraform destroy -auto-approve

logs:
	aws logs tail /ecs/jwt-drop-app-service --region $(AWS_REGION) --profile $(AWS_PROFILE) --follow --format short

run-local: keys
	@npm run build --workspace=@jwt-drop/application-service
	@SNS_ARN=$$(cd terraform && terraform output -raw sns_topic_arn 2>/dev/null || echo ""); \
	if [ -n "$$SNS_ARN" ]; then \
		echo "==> Starting Application Service locally (connected to AWS SNS: $$SNS_ARN)..."; \
	else \
		echo "==> Starting Application Service locally (standalone mode, no SNS)..."; \
	fi; \
	SNS_TOPIC_ARN=$$SNS_ARN node services/application-service/dist/server.cjs

clean:
	npm run clean --workspaces --if-present
