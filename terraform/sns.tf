resource "aws_sns_topic" "session_invalidation" {
  name = "${var.project_name}-session-invalidation"
}
