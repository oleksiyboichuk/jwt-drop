resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

resource "aws_cloudwatch_log_group" "app_service" {
  name              = "/ecs/${var.project_name}-app-service"
  retention_in_days = 7
}

resource "aws_ecs_task_definition" "app_service" {
  family                   = "${var.project_name}-app-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.app_service_cpu
  memory                   = var.app_service_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app-service"
      image     = "${aws_ecr_repository.app_service.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = var.app_service_port
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "PORT", value = tostring(var.app_service_port) },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "SNS_TOPIC_ARN", value = aws_sns_topic.session_invalidation.arn },
        { name = "RSA_PUBLIC_KEY", value = file("${path.module}/../keys/public.key") },
        { name = "NODE_ENV", value = "production" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app_service.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "app"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "app_service" {
  name            = "${var.project_name}-app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app_service.arn
  desired_count   = var.app_service_desired_count
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = module.vpc.public_subnets
    security_groups  = [aws_security_group.app_service.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app_service.arn
    container_name   = "app-service"
    container_port   = var.app_service_port
  }

  depends_on = [aws_lb_listener.app_service]
}
