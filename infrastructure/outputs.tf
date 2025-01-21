output "lambda_function_arn" {
  value = aws_lambda_function.sftp_sync.arn
}

output "sns_topic_arn" {
  value = aws_sns_topic.sftp_sync_notifications.arn
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.lambda_logs.name
}