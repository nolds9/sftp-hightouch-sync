# SFTP Sync Lambda Service

## Overview

Simple Lambda function that runs on a schedule to copy files on a remote SFTP server and trigger a Hightouch sync. Provides email notifications via SNS for any failures.

## Features

- Scheduled execution (12:05am, 12:05pm EST)
- SFTP file copying
- Hightouch sync triggering
- SNS notifications for errors
- TypeScript for type safety
- Minimal AWS infrastructure

## Project Structure

```
sftp-sync/
├── src/
│   ├── index.ts          # Lambda handler
│   ├── sync.ts           # Main sync logic
│   ├── config.ts         # Configuration management
│   └── types.ts          # TypeScript types
├── infrastructure/
│   └── main.tf           # Terraform configuration
├── scripts
│   └── deploy.sh         # Deployment helper
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Required AWS Resources

1. Lambda Function

   - Memory: 128MB
   - Timeout: 5 minutes
   - Runtime: Node.js 20.x

2. EventBridge Rule

   - Schedule: cron(0 10,16,22 \* _ ? _)
   - Target: Lambda function

3. SNS Topic

   - Email subscription for alerts

4. IAM Role
   - Lambda execution
   - SNS publish permissions

## Environment Variables

```env
SFTP_HOST=example.com
SFTP_PORT=22
SFTP_USERNAME=user
SFTP_PASSWORD=pass
SFTP_SOURCE_DIR=/tmp/data
SFTP_DEST_DIR=/tmp/hightouch
SFTP_DEST_FILENAME=current-data.csv
HIGHTOUCH_API_KEY=your-api-key
HIGHTOUCH_SYNC_ID=your-sync-id
SNS_TOPIC_ARN=arn:aws:sns:region:account:topic
```

## Deployment

Run deployment script via npm for appropriate OS:

For Windows:

```bash
npm run deploy:windows
```

For Unix:

```bash
npm run deploy:unix
```

This will create a `function.zip` file in the root of the project.

Then you will need to run `terraform plan` and `terraform apply` in the `infrastructure` directory to deploy the Lambda function and EventBridge rule.

```bash
cd infrastructure
terraform plan
terraform apply
```

## Monitoring

- CloudWatch Logs for execution logs
- SNS notifications for errors
- Manual execution possible via AWS Console

## Maintenance

- Update dependencies monthly
- Rotate SFTP credentials as needed
- Monitor CloudWatch Logs for issues

## Changelog

### v1.2.1 (Current)

- Changed sync schedule to run at 5 minutes past the hour (12:05) to allow more time for syncs

### v1.2.0

- Added support for parallel file processing with independent error handling
- Improved file selection logic with better date handling
- Enhanced logging for file processing and sync status
- Added SNS notifications for individual file failures
- Increased Lambda timeout to 5 minutes for better reliability
- Updated dependencies to latest versions
- Added Windows PowerShell deployment script

### v1.1.0

- Updated to handle new file patterns:
  - FTP_Prior1Month
  - FTP_Prior2Month
  - FTP_CurrentDayThruYear
  - FTP_NextYear
- Improved error handling with partial success states
- Added individual file failure notifications
- Each file is now processed independently
