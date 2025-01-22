# Build TypeScript
Write-Host "Building TypeScript..."
npm run build

# Create temporary directory for packaging
Write-Host "Creating deployment package..."
$TEMP_DIR = Join-Path $env:TEMP ([System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

# Copy files
Copy-Item -Path "dist\*" -Destination $TEMP_DIR -Recurse
Copy-Item -Path "node_modules" -Destination $TEMP_DIR -Recurse
Copy-Item -Path "package.json" -Destination $TEMP_DIR

# Create ZIP file
Write-Host "Creating ZIP file..."
Compress-Archive -Path "$TEMP_DIR\*" -DestinationPath "$TEMP_DIR\function.zip" -Force

# Move ZIP file to project root for Terraform
Move-Item -Path "$TEMP_DIR\function.zip" -Destination "..\function.zip" -Force

# Cleanup
Remove-Item -Path $TEMP_DIR -Recurse -Force

Write-Host "Deployment package created!"
Write-Host "Now run 'terraform apply' in the infrastructure directory to deploy" 