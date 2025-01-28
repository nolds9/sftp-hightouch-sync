# Build TypeScript
Write-Host "Building TypeScript..."
npm run build

# Create zip file
Compress-Archive -Path dist/*, node_modules/* -DestinationPath function.zip -Force

# Update Lambda function
Write-Host "Updating Lambda function..."
aws lambda update-function-code --function-name sftp-sync --zip-file fileb://function.zip

Write-Host "Deployment package created!"
Write-Host "Now run 'terraform apply' in the infrastructure directory to deploy" 