variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "notification_email" {
  description = "Email address to receive notifications"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.notification_email))
    error_message = "Must be a valid email address"
  }
}

variable "sftp_host" {
  description = "SFTP server hostname"
  type        = string
}

variable "sftp_port" {
  description = "SFTP server port"
  type        = number
  default     = 22
  validation {
    condition     = var.sftp_port > 0 && var.sftp_port < 65536
    error_message = "SFTP port must be between 1 and 65535"
  }
}

variable "sftp_username" {
  description = "SFTP username"
  type        = string
}

variable "sftp_password" {
  description = "SFTP password"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.sftp_password) > 0
    error_message = "SFTP password cannot be empty"
  }
}


variable "sftp_source_dir" {
  description = "Source directory on SFTP server"
  type        = string
}

variable "sftp_dest_dir" {
  description = "Destination directory on SFTP server"
  type        = string
}

variable "sftp_dest_filename" {
  description = "Destination filename"
  type        = string
}

variable "hightouch_api_key" {
  description = "Hightouch API key"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.hightouch_api_key) > 0
    error_message = "Hightouch API key cannot be empty"
  }
}

variable "hightouch_sync_id" {
  description = "Hightouch sync ID"
  type        = string
} 