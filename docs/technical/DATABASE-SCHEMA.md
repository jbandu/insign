# Database Schema - Insign Platform

> **Complete PostgreSQL database schema for all modules**
> Version: 1.0 | Last Updated: November 2025

---

## 🗄️ Overview

### Database: PostgreSQL 15+
### Provider: Supabase
### Features Used:
- Row Level Security (RLS)
- Full-Text Search (tsvector)
- JSONB for flexible data
- UUID primary keys
- Timestamp tracking
- Enum types
- Triggers and functions

---

## 📊 Schema Diagram

```
organizations
├── users
│   ├── roles
│   │   └── role_permissions
│   │       └── permissions
│   ├── user_sessions
│   ├── mfa_methods
│   └── audit_logs
├── folders
│   └── documents
│       ├── document_versions
│       ├── document_permissions
│       ├── document_shares
│       ├── document_tags
│       └── document_tag_assignments
├── signature_requests
│   ├── signature_participants
│   ├── signature_fields
│   ├── signatures
│   ├── signature_audit_logs
│   └── signature_certificates
├── workflows (TBD)
├── hr_records (TBD)
├── messages (TBD)
└── storage_quotas
```

---

## 🏢 Core Tables

### organizations
Multi-tenant organization table

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'starter', 'business', 'enterprise')),
  max_users INTEGER DEFAULT 50,
  max_storage_bytes BIGINT DEFAULT 10737418240, -- 10GB
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled'))
);

-- Indexes
CREATE INDEX idx_organizations_domain ON organizations(domain);
CREATE INDEX idx_organizations_status ON organizations(status);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT u.org_id FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'Admin'
    )
  );
```

### users
User accounts with role-based access

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role_id UUID REFERENCES roles(id),
  mfa_enabled BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  UNIQUE(org_id, email)
);

-- Indexes
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view users in their org"
  ON users FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());
```

---

## 🔐 Authentication & Authorization

### roles
Role definitions for RBAC

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

-- System roles (cannot be deleted)
INSERT INTO roles (org_id, name, description, is_system) VALUES
  (NULL, 'Admin', 'Full system access', TRUE),
  (NULL, 'Manager', 'Team management access', TRUE),
  (NULL, 'Member', 'Standard user access', TRUE),
  (NULL, 'Guest', 'Limited read-only access', TRUE);

-- Indexes
CREATE INDEX idx_roles_org ON roles(org_id);
```

### permissions
Granular permissions for resources

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  UNIQUE(resource, action)
);

-- Seed permissions
INSERT INTO permissions (resource, action, description) VALUES
  ('organizations', 'admin', 'Manage organization settings'),
  ('users', 'read', 'View users'),
  ('users', 'write', 'Create and edit users'),
  ('users', 'delete', 'Delete users'),
  ('roles', 'admin', 'Manage roles and permissions'),
  ('documents', 'read', 'View documents'),
  ('documents', 'write', 'Create and edit documents'),
  ('documents', 'delete', 'Delete documents'),
  ('documents', 'admin', 'Manage document permissions'),
  ('signatures', 'read', 'View signature requests'),
  ('signatures', 'write', 'Create signature requests'),
  ('signatures', 'admin', 'Manage all signature requests'),
  ('workflows', 'read', 'View workflows'),
  ('workflows', 'write', 'Create and edit workflows'),
  ('workflows', 'admin', 'Manage all workflows'),
  ('reports', 'read', 'View reports'),
  ('reports', 'write', 'Create reports');
```

### role_permissions
Many-to-many mapping of roles to permissions

```sql
CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Seed default permissions for system roles
-- Admin: All permissions
-- Manager: Read/Write on most resources
-- Member: Read on most, write on own content
-- Guest: Read only
```

### user_sessions
Active user sessions for session management

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  refresh_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Auto-delete expired sessions
CREATE OR REPLACE FUNCTION delete_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### mfa_methods
Multi-factor authentication settings

```sql
CREATE TABLE mfa_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('totp', 'sms')),
  secret TEXT NOT NULL, -- Encrypted
  backup_codes TEXT[], -- Encrypted, hashed
  enabled BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);
```

### sso_providers
Single Sign-On provider configurations

```sql
CREATE TABLE sso_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('saml', 'google', 'microsoft', 'okta')),
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  attribute_mapping JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, provider)
);
```

---

## 📄 Document Management

### folders
Hierarchical folder structure

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL, -- Materialized path: /parent/child/grandchild
  description TEXT,
  permissions_inherited BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(org_id, parent_id, name),
  CHECK (path ~ '^(/[^/]+)+$')
);

-- Indexes
CREATE INDEX idx_folders_org ON folders(org_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_folders_path ON folders USING GIST (path gist_trgm_ops);
```

### documents
Document metadata and references

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  version INTEGER DEFAULT 1,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  content_text TEXT, -- Extracted text for search
  search_vector tsvector,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);

-- Full-text search trigger
CREATE TRIGGER documents_search_update
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', name, content_text);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents they have access to"
  ON documents FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR id IN (
        SELECT document_id FROM document_permissions
        WHERE user_id = auth.uid()
      )
    )
  );
```

### document_versions
Version history for documents

```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  changes_description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version)
);

CREATE INDEX idx_document_versions_document ON document_versions(document_id, version DESC);
```

### document_permissions
Granular document sharing permissions

```sql
CREATE TABLE document_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('read', 'write', 'delete', 'admin')),
  granted_by UUID NOT NULL REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CHECK (user_id IS NOT NULL OR role_id IS NOT NULL)
);

CREATE INDEX idx_document_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_document_permissions_user ON document_permissions(user_id);
```

### document_shares
Public share links for documents

```sql
CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  max_access_count INTEGER,
  last_accessed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_document_shares_token ON document_shares(share_token);
```

### document_tags
Tagging system for documents

```sql
CREATE TABLE document_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#gray',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE TABLE document_tag_assignments (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (document_id, tag_id)
);
```

---

## ✍️ E-Signature System

### signature_requests
Signature workflow requests

```sql
CREATE TYPE signature_request_status AS ENUM (
  'draft', 'sent', 'in_progress', 'completed', 'declined', 'expired', 'cancelled'
);

CREATE TYPE workflow_type AS ENUM ('sequential', 'parallel');

CREATE TABLE signature_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id),
  title TEXT NOT NULL,
  message TEXT,
  status signature_request_status DEFAULT 'draft',
  workflow_type workflow_type DEFAULT 'sequential',
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  seal_hash TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signature_requests_org ON signature_requests(org_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);
CREATE INDEX idx_signature_requests_created_by ON signature_requests(created_by);
```

### signature_participants
Participants in signature workflows

```sql
CREATE TYPE participant_role AS ENUM ('signer', 'approver', 'cc');
CREATE TYPE participant_status AS ENUM (
  'pending', 'notified', 'viewed', 'signed', 'declined', 'expired'
);

CREATE TABLE signature_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role participant_role NOT NULL DEFAULT 'signer',
  order_index INTEGER NOT NULL DEFAULT 0,
  status participant_status DEFAULT 'pending',
  access_token TEXT UNIQUE NOT NULL,
  notified_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signature_participants_request ON signature_participants(request_id);
CREATE INDEX idx_signature_participants_token ON signature_participants(access_token);
```

### signature_fields
Signature field placements

```sql
CREATE TYPE signature_field_type AS ENUM (
  'signature', 'initials', 'date', 'text', 'checkbox', 'dropdown'
);

CREATE TABLE signature_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL,
  type signature_field_type NOT NULL,
  page_number INTEGER NOT NULL,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  width FLOAT NOT NULL,
  height FLOAT NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  label TEXT,
  options JSONB,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signature_fields_request ON signature_fields(request_id);
```

### signatures
Captured signatures

```sql
CREATE TYPE signature_type AS ENUM ('drawn', 'typed', 'uploaded', 'certificate');

CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES signature_participants(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES signature_fields(id),
  signature_data TEXT NOT NULL,
  signature_type signature_type NOT NULL,
  certificate TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET NOT NULL,
  user_agent TEXT
);

CREATE INDEX idx_signatures_participant ON signatures(participant_id);
```

### signature_audit_logs
Complete audit trail for signatures

```sql
CREATE TABLE signature_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES signature_participants(id),
  action TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signature_audit_request ON signature_audit_logs(request_id, timestamp DESC);

-- Make audit logs append-only
ALTER TABLE signature_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are append-only"
  ON signature_audit_logs
  FOR ALL
  USING (false)
  WITH CHECK (true);
```

### signature_certificates
Completion certificates

```sql
CREATE TABLE signature_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES signature_requests(id),
  certificate_data JSONB NOT NULL,
  seal_hash TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 Storage & Quotas

### storage_quotas
Track storage usage per organization

```sql
CREATE TABLE storage_quotas (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  total_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10GB
  used_bytes BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE storage_quotas
    SET used_bytes = used_bytes + NEW.size_bytes, updated_at = NOW()
    WHERE org_id = NEW.org_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE storage_quotas
    SET used_bytes = used_bytes - OLD.size_bytes, updated_at = NOW()
    WHERE org_id = OLD.org_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER storage_usage_trigger
  AFTER INSERT OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_storage_usage();
```

---

## 📝 Audit Logs

### audit_logs
System-wide audit logging

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org_timestamp ON audit_logs(org_id, timestamp DESC);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- RLS: Only admins can view audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    org_id IN (
      SELECT u.org_id FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'Admin'
    )
  );
```

---

## 🛠️ Helper Functions

### has_permission
Check if user has a specific permission

```sql
CREATE OR REPLACE FUNCTION has_permission(
  user_uuid UUID,
  resource_name TEXT,
  action_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = user_uuid
      AND p.resource = resource_name
      AND p.action = action_name
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📅 Future Tables (TBD)

- `workflows` - Workflow definitions
- `workflow_instances` - Workflow executions
- `hr_leave_requests` - Leave management
- `hr_expenses` - Expense reports
- `messages` - Direct messaging
- `channels` - Team channels
- `notifications` - Notification queue

---

**Schema Version:** 1.0
**Last Updated:** November 2025
**Maintained By:** Engineering Team
