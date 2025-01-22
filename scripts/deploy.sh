#!/bin/bash
set -e

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Create temporary directory for packaging
echo "Creating deployment package..."
TEMP_DIR=$(mktemp -d)
cp -r dist/* $TEMP_DIR/
cp -r node_modules $TEMP_DIR/
cp package.json $TEMP_DIR/

# Create ZIP file - handle both Windows and Unix
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash) - use PowerShell
    echo "Using PowerShell to create ZIP..."
    powershell -Command "Compress-Archive -Path '$TEMP_DIR/*' -DestinationPath '$TEMP_DIR/function.zip' -Force"
else
    # Unix - use zip command
    echo "Using zip command to create ZIP..."
    cd $TEMP_DIR
    zip -r function.zip ./*
    cd -
fi

# Move ZIP file to project root for Terraform
mv $TEMP_DIR/function.zip ../function.zip

# Cleanup
rm -rf $TEMP_DIR

echo "Deployment package created!"
echo "Now run 'terraform apply' in the infrastructure directory to deploy" 