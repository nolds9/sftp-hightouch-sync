#!/bin/bash
set -e

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Create zip file
zip -r function.zip dist node_modules

# Update Lambda function
aws lambda update-function-code --function-name sftp-sync --zip-file fileb://function.zip

echo "Deployment package created!"
echo "Now run 'terraform apply' in the infrastructure directory to deploy" 