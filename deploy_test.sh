#!/bin/bash

# Confirmation prompt for test deployment
echo "Deploying to TEST environment"
echo "This will update: pos:/var/www/html/integranet.xyz/subdomains/test/produccion/"
echo ""
read -p "Are you sure you want to deploy to test? (type exactly 'YES' to confirm): " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "Deployment cancelled. You must type exactly 'YES' to confirm."
    exit 1
fi

echo "Deploying to test..."
rsync -av --info=progress2 dist/posprocesos/browser/* pos:/var/www/html/integranet.xyz/subdomains/test/produccion/