-- Update admin user permissions to include all necessary access
-- This grants admin user full access to all admin features

-- Update the admin user's permissions JSON field to include all required permissions
UPDATE "admins" 
SET "permissions" = '{
  "products": ["read", "write", "delete", "approve", "reject"],
  "orders": ["read", "write", "update", "cancel"],
  "customers": ["read", "write", "update", "delete"],
  "inventory": ["read", "write", "update", "delete", "alerts"],
  "analytics": ["read", "export"],
  "dashboard": ["read"],
  "configuration": ["read", "write"],
  "vendors": ["read", "write", "approve", "reject", "settle"],
  "audit": ["read", "export"],
  "reports": ["read", "create", "delete"]
}',
"updated_at" = NOW()
WHERE "role" = 'admin';

-- Verify the update
SELECT "userId", "role", jsonb_pretty("permissions"::jsonb) as permissions 
FROM "admins" 
WHERE "role" = 'admin';