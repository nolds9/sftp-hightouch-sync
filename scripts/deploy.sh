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

# Create ZIP file
cd $TEMP_DIR
zip -r function.zip ./*

# Upload to Lambda
echo "Deploying to Lambda..."
aws lambda update-function-code \
  --function-name sftp-sync \
  --zip-file fileb://function.zip

# Cleanup
cd -
rm -rf $TEMP_DIR

echo "Deployment complete!" 