-- Seed System Roles
-- These are global roles that apply to all organizations

INSERT INTO roles (org_id, name, description, is_system) VALUES
  (NULL, 'Admin', 'Full system access - can manage everything', true),
  (NULL, 'Manager', 'Team management access - can manage users and content', true),
  (NULL, 'Member', 'Standard user access - can create and manage own content', true),
  (NULL, 'Guest', 'Limited read-only access', true)

ON CONFLICT (org_id, name) DO NOTHING;

-- Verify roles were created
SELECT id, name, description, is_system FROM roles WHERE is_system = true ORDER BY name;
