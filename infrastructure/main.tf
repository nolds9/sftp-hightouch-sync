terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# SNS Topic for notifications
resource "aws_sns_topic" "sftp_sync_notifications" {
  name = "sftp-sync-notifications"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.sftp_sync_notifications.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "sftp_sync_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for Lambda
resource "aws_iam_role_policy" "lambda_policy" {
  name = "sftp_sync_lambda_policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          aws_sns_topic.sftp_sync_notifications.arn
        ]
      },
    ]
  })
}

# Lambda Function
resource "aws_lambda_function" "sftp_sync" {
  filename         = "../function.zip"  # This will be created by deploy.sh
  function_name    = "sftp-sync"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 256
  timeout          = 300
  source_code_hash = filebase64sha256("../function.zip")
  
  environment {
    variables = {
      SFTP_HOST           = var.sftp_host
      SFTP_PORT           = var.sftp_port
      SFTP_USERNAME       = var.sftp_username
      SFTP_PASSWORD       = var.sftp_password
      SFTP_SOURCE_DIR     = var.sftp_source_dir
      SFTP_DEST_DIR       = var.sftp_dest_dir
      SFTP_DEST_FILENAME  = var.sftp_dest_filename
      HIGHTOUCH_API_KEY   = var.hightouch_api_key
      HIGHTOUCH_SYNC_ID   = var.hightouch_sync_id
      SNS_TOPIC_ARN       = aws_sns_topic.sftp_sync_notifications.arn
      TZ                  = "America/New_York"
    }
  }
}

# CloudWatch Event Rule
resource "aws_scheduler_schedule" "sftp_sync" {
  name        = "sftp-sync-schedule"
  description = "Schedule for SFTP Sync Lambda (runs at 12am and 12pm Eastern)"
  
  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression = "cron(0 0,12 * * ? *)"
  schedule_expression_timezone = "America/New_York"

  target {
    arn      = aws_lambda_function.sftp_sync.arn
    role_arn = aws_iam_role.scheduler_role.arn
  }
}

# IAM role for EventBridge scheduler
resource "aws_iam_role" "scheduler_role" {
  name = "sftp_sync_scheduler_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "scheduler_policy" {
  name = "sftp_sync_scheduler_policy"
  role = aws_iam_role.scheduler_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          aws_lambda_function.sftp_sync.arn
        ]
      }
    ]
  })
}

resource "aws_lambda_permission" "allow_scheduler" {
  statement_id  = "AllowSchedulerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sftp_sync.function_name
  principal     = "scheduler.amazonaws.com"
  source_arn    = aws_scheduler_schedule.sftp_sync.arn
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.sftp_sync.function_name}"
  retention_in_days = 7  # Keep logs for 7 days to minimize costs
}

