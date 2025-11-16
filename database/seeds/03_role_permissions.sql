-- Assign Permissions to System Roles
-- This maps permissions to each role

-- Helper: Get role and permission IDs
-- Run this query first to see the IDs:
-- SELECT r.id as role_id, r.name as role_name, p.id as permission_id, p.resource, p.action
-- FROM roles r CROSS JOIN permissions p WHERE r.is_system = true ORDER BY r.name, p.resource, p.action;

-- Admin Role - Gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' AND r.is_system = true
ON CONFLICT DO NOTHING;

-- Manager Role - Can read everything, write most things, admin some things
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager' AND r.is_system = true
AND (
  p.action = 'read' -- All read permissions
  OR (p.resource IN ('users', 'documents', 'folders', 'signatures') AND p.action IN ('write', 'delete')) -- Write/delete on main resources
  OR (p.resource = 'reports' AND p.action = 'write') -- Can create reports
)
ON CONFLICT DO NOTHING;

-- Member Role - Standard user permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Member' AND r.is_system = true
AND (
  p.action = 'read' -- All read permissions
  OR (p.resource IN ('documents', 'folders', 'signatures') AND p.action = 'write') -- Write on own content
)
ON CONFLICT DO NOTHING;

-- Guest Role - Read-only permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Guest' AND r.is_system = true
AND p.action = 'read' -- Only read permissions
AND p.resource NOT IN ('audit', 'settings') -- Except audit logs and settings
ON CONFLICT DO NOTHING;

-- Verify role permissions were assigned
SELECT
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.is_system = true
GROUP BY r.id, r.name
ORDER BY r.name;

-- Show detailed permissions per role
SELECT
  r.name as role_name,
  p.resource,
  p.action,
  p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_system = true
ORDER BY r.name, p.resource, p.action;
