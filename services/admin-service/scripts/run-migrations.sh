#!/bin/bash

# Script to run Prisma migrations for Admin Service

echo "🔄 Running Prisma migrations for Admin Service..."

# Navigate to admin service directory
cd "$(dirname "$0")/.."

# Run Prisma migrations
npx prisma migrate deploy --name add_admin_permissions

# Generate Prisma client
npx prisma generate

echo "✅ Migrations completed successfully!"