# SFTP Sync

## High Level

- This is a scheduled service to copy a file from a remote SFTP server to another destination on that remote server, then kick off a HighTouch Sync via the Hightouch API.
- This service is designed to be run on a remote server, as a docker container, uploaded to ECR, and run on an ECS cluster.
- This service takes a configuration based approach and leverages environment variables for all sensitive information. These environment variables are stored in AWS Secrets Manager.
- The service will be deployed to the AWS ECS cluster in the `prod` environment.
- This service will be built using TypeScript and leverage github actions for CI/CD.
- This service will have a docker image built and pushed to the ECR repository on every code commit.
- This service will have a error handling and logging strategy in place. A notification service will be used to send errors to an email using NodeMailer.
- This service will have a health check feature to ensure it is configured correctly.
- This service will be as cost effective as possible while also following AWS best practices.
- THis service will run on a cron schedule configured by the config file but initially at 10:05 AM, 4:05 PM, & 10:05 PM EST

## Detailed Design

High level architecture can be found in the [architecture.mermaid](./architecture.mermaid) file.

## Implementation

- [ ] Create a new docker image for the service.
- [ ] Create a new github actions workflow to build, test, and push the docker image to the ECR repository.
- [ ] Create a new ECS task definition for the service.
- [ ] Create a new ECS service to run the task definition.
- [ ] Create a new ECS cluster to run the service.
- [ ] Create a new AWS Secrets Manager secret for the service.
- [ ] Create a new AWS CloudWatch log group for the service.
- [ ] Create a new AWS CloudWatch alarm to monitor the service.
