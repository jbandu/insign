-- Seed Permissions
-- Run this first to create all system permissions

INSERT INTO permissions (resource, action, description) VALUES
  -- Organizations
  ('organizations', 'read', 'View organization details'),
  ('organizations', 'write', 'Update organization settings'),
  ('organizations', 'admin', 'Full organization management'),

  -- Users
  ('users', 'read', 'View users in organization'),
  ('users', 'write', 'Create and edit users'),
  ('users', 'delete', 'Delete users'),
  ('users', 'admin', 'Full user management including role assignments'),

  -- Roles & Permissions
  ('roles', 'read', 'View roles and permissions'),
  ('roles', 'write', 'Create and edit roles'),
  ('roles', 'delete', 'Delete custom roles'),
  ('roles', 'admin', 'Full role and permission management'),

  -- Documents
  ('documents', 'read', 'View documents'),
  ('documents', 'write', 'Create and edit documents'),
  ('documents', 'delete', 'Delete documents'),
  ('documents', 'admin', 'Manage document permissions and settings'),

  -- Folders
  ('folders', 'read', 'View folders'),
  ('folders', 'write', 'Create and edit folders'),
  ('folders', 'delete', 'Delete folders'),
  ('folders', 'admin', 'Manage folder permissions'),

  -- Signatures
  ('signatures', 'read', 'View signature requests'),
  ('signatures', 'write', 'Create and send signature requests'),
  ('signatures', 'delete', 'Cancel signature requests'),
  ('signatures', 'admin', 'Manage all signature requests'),

  -- Workflows (Future)
  ('workflows', 'read', 'View workflows'),
  ('workflows', 'write', 'Create and edit workflows'),
  ('workflows', 'delete', 'Delete workflows'),
  ('workflows', 'admin', 'Manage all workflows'),

  -- Reports & Analytics
  ('reports', 'read', 'View reports and analytics'),
  ('reports', 'write', 'Create custom reports'),
  ('reports', 'admin', 'Full reporting and analytics access'),

  -- Audit Logs
  ('audit', 'read', 'View audit logs'),
  ('audit', 'admin', 'Full audit log access and export'),

  -- Settings
  ('settings', 'read', 'View system settings'),
  ('settings', 'write', 'Update system settings'),
  ('settings', 'admin', 'Full system configuration access')

ON CONFLICT (resource, action) DO NOTHING;

-- Verify permissions were created
SELECT COUNT(*) as total_permissions FROM permissions;
