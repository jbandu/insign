-- Create Demo Organization and Admin User
-- OPTIONAL: Use this for testing and development

-- 1. Create demo organization
INSERT INTO organizations (name, domain, subscription_tier, status)
VALUES ('Demo Organization', 'demo.insign.local', 'trial', 'active')
ON CONFLICT (domain) DO NOTHING
RETURNING id;

-- Note: Replace 'YOUR_ORG_ID' below with the ID returned above, or run this query:
-- SELECT id FROM organizations WHERE domain = 'demo.insign.local';

-- 2. Create admin user
-- Password: "admin123" (hashed with bcrypt)
-- IMPORTANT: Change this password immediately after first login!

DO $$
DECLARE
  org_id_var uuid;
  admin_role_id uuid;
  user_id_var uuid;
BEGIN
  -- Get the organization ID
  SELECT id INTO org_id_var FROM organizations WHERE domain = 'demo.insign.local';

  -- Get the Admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin' AND is_system = true;

  -- Create admin user
  INSERT INTO users (
    org_id,
    email,
    password,
    first_name,
    last_name,
    role_id,
    email_verified,
    status
  )
  VALUES (
    org_id_var,
    'admin@demo.insign.local',
    '$2a$10$rN8KN0p9XcGZHJZnQqZ9X.YfKQqZqN9QqZqN9QqZqN9QqZqN9QqZq', -- "admin123"
    'Admin',
    'User',
    admin_role_id,
    NOW(),
    'active'
  )
  ON CONFLICT (org_id, email) DO NOTHING
  RETURNING id INTO user_id_var;

  -- Create storage quota for the organization
  INSERT INTO storage_quotas (org_id, total_bytes, used_bytes)
  VALUES (org_id_var, 10737418240, 0) -- 10GB
  ON CONFLICT (org_id) DO NOTHING;

  RAISE NOTICE 'Demo organization and admin user created successfully!';
  RAISE NOTICE 'Email: admin@demo.insign.local';
  RAISE NOTICE 'Password: admin123';
  RAISE NOTICE 'IMPORTANT: Change this password after first login!';
END $$;

-- Verify demo data
SELECT
  o.name as organization,
  o.domain,
  o.subscription_tier,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role
FROM organizations o
JOIN users u ON u.org_id = o.id
JOIN roles r ON u.role_id = r.id
WHERE o.domain = 'demo.insign.local';
