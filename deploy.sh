#!/bin/bash

# Confirmation prompt for deployment
echo "WARNING: You are about to deploy to PRODUCTION"
echo "This will update: pos:/var/www/html/integranet.xyz/subdomains/pos/produccion/"
echo ""
read -p "Are you sure you want to deploy? (type exactly 'YES' to confirm): " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "Deployment cancelled. You must type exactly 'YES' to confirm."
    exit 1
fi

echo "Deploying to production..."
rsync -av --info=progress2 dist/posprocesos/browser/* pos:/var/www/html/integranet.xyz/subdomains/pos/produccion/
