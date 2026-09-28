resource "aws_lb" "app_service" {
  name            = "${var.project_name}-alb"
  security_groups = [aws_security_group.alb.id]
  subnets         = module.vpc.public_subnets
}

resource "aws_lb_target_group" "app_service" {
  name        = "${var.project_name}-tg"
  port        = var.app_service_port
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }
}

resource "aws_lb_listener" "app_service" {
  load_balancer_arn = aws_lb.app_service.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_service.arn
  }
}
