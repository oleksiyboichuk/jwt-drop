output "session_manager_api_url" {
  value = aws_apigatewayv2_stage.session_manager.invoke_url
}

output "application_service_url" {
  value = "http://${aws_lb.app_service.dns_name}"
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app_service.repository_url
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.sessions.name
}

output "sns_topic_arn" {
  value = aws_sns_topic.session_invalidation.arn
}
