data "archive_file" "session_manager" {
  type        = "zip"
  source_file = "${path.module}/../services/session-manager/dist/index.cjs"
  output_path = "${path.module}/../services/session-manager/dist/function.zip"
}

resource "aws_lambda_function" "session_manager" {
  function_name = "${var.project_name}-session-manager"
  role          = aws_iam_role.lambda_exec.arn

  filename         = data.archive_file.session_manager.output_path
  source_code_hash = data.archive_file.session_manager.output_base64sha256

  handler = "index.handler"
  runtime = "nodejs22.x"
  timeout = 15

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.sessions.name
      SNS_TOPIC_ARN       = aws_sns_topic.session_invalidation.arn
      RSA_PRIVATE_KEY     = file("${path.module}/../keys/private.key")
    }
  }
}

resource "aws_cloudwatch_log_group" "session_manager" {
  name              = "/aws/lambda/${aws_lambda_function.session_manager.function_name}"
  retention_in_days = 7
}

resource "aws_apigatewayv2_api" "session_manager" {
  name          = "${var.project_name}-session-manager-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "session_manager" {
  api_id                  = aws_apigatewayv2_api.session_manager.id
  integration_type        = "AWS_PROXY"
  integration_uri         = aws_lambda_function.session_manager.invoke_arn
  integration_method      = "POST"
  payload_format_version  = "2.0"
}

resource "aws_apigatewayv2_route" "login" {
  api_id    = aws_apigatewayv2_api.session_manager.id
  route_key = "POST /login"
  target    = "integrations/${aws_apigatewayv2_integration.session_manager.id}"
}

resource "aws_apigatewayv2_route" "invalidate" {
  api_id    = aws_apigatewayv2_api.session_manager.id
  route_key = "POST /session/{sessionId}/invalidate"
  target    = "integrations/${aws_apigatewayv2_integration.session_manager.id}"
}

resource "aws_apigatewayv2_stage" "session_manager" {
  api_id      = aws_apigatewayv2_api.session_manager.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.session_manager.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.session_manager.execution_arn}/*/*"
}
