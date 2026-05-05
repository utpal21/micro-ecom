#!/bin/sh
set -e

# Wait for admin-service to be ready (optional)
# if [ -n "$ADMIN_SERVICE_URL" ]; then
#   echo "Waiting for admin-service at $ADMIN_SERVICE_URL..."
#   while ! wget --no-verbose --tries=1 --spider "$ADMIN_SERVICE_URL/health" 2>/dev/null; do
#     sleep 2
#   done
#   echo "Admin service is ready!"
# fi

# Start nginx
echo "Starting Nginx..."
exec nginx -g "daemon off;"