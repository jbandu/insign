# Epic 1: Foundation & Authentication

**Epic ID:** EPIC-01
**Epic Owner:** Product Lead
**Status:** =Ë Backlog
**Priority:** Critical
**Story Points:** 55
**Sprint:** 1-2

---

## Epic Overview

Foundation & Authentication establishes the core platform infrastructure including multi-tenant organization setup, user management, authentication, authorization, and security fundamentals. This epic is the critical path for all other features.

### Business Value
- Enable secure multi-tenant operations
- Provide enterprise-grade authentication (SSO, MFA)
- Implement role-based access control
- Ensure compliance through audit logging
- Create scalable foundation for all features

### Success Criteria
- Organizations can be created and configured
- Users can register, login, and manage profiles
- Support for email/password, SSO, and MFA authentication
- Comprehensive RBAC system with custom roles
- Complete audit trail for all auth events
- Sub-2 second authentication response time
- 99.9% authentication uptime

---

## Technical Context

### Database Tables Required
```sql
-- Core tables
organizations (id, name, domain, settings, created_at, status)
users (id, org_id, email, profile, role_id, mfa_enabled, created_at)
roles (id, org_id, name, permissions, is_system, created_at)
permissions (id, resource, action, description)
role_permissions (role_id, permission_id)
user_sessions (id, user_id, token, expires_at, device_info)
audit_logs (id, org_id, user_id, action, resource, metadata, timestamp)
mfa_methods (id, user_id, type, secret, backup_codes)
sso_providers (id, org_id, provider, config, enabled)
```

### Supabase Integration
- **Auth:** Supabase Auth for authentication flows
- **RLS:** Row Level Security for multi-tenant isolation
- **Realtime:** Real-time user status updates
- **Storage:** Profile picture storage

### Security Requirements
- Password: Min 12 chars, complexity requirements
- MFA: TOTP (Time-based OTP) support
- Session: JWT tokens with refresh mechanism
- RLS: Strict tenant isolation
- Audit: Log all authentication events

---

## User Stories

### 1. Organization Setup & Onboarding

#### [US-1.1] Organization Creation
**As a** new customer
**I want to** create and configure my organization
**So that** I can set up the platform for my company

**Priority:** Critical
**Story Points:** 8
**Sprint:** 1

**Acceptance Criteria:**
- [ ] Given I am on the signup page, when I provide organization name and admin email, then an organization is created
- [ ] Given I create an organization, when the process completes, then I receive a verification email
- [ ] Given I verify my email, when I log in, then I am prompted to complete organization setup
- [ ] Given I am setting up my org, when I provide company domain, logo, and timezone, then settings are saved
- [ ] Given an organization already exists with a domain, when someone tries to create another with the same domain, then they receive an error

**Technical Notes:**
- Database: Insert into `organizations` table
- Supabase: Create org-specific RLS policies
- API Endpoints:
  - `POST /api/organizations` - Create organization
  - `PUT /api/organizations/{id}/setup` - Complete setup
  - `GET /api/organizations/{id}/settings` - Get settings
- Email: Welcome email with setup link
- Validation: Unique domain per organization
- Default: Create default roles (Admin, Manager, Member)

**Database Schema:**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'trial',
  max_users INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial'))
);

-- RLS Policy
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));
```

**UI/UX Requirements:**
- Multi-step wizard: Company Info ’ Admin Account ’ Preferences
- Logo upload (max 2MB, PNG/JPG)
- Domain validation with real-time feedback
- Progress indicator showing setup steps

**Test Scenarios:**
- [ ] Happy path: Complete organization creation flow
- [ ] Edge case: Duplicate domain name
- [ ] Edge case: Invalid email format
- [ ] Edge case: Logo file too large
- [ ] Error handling: Network failure during creation
- [ ] Security: SQL injection attempts in org name

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] RLS policies tested and verified
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Security review completed

---

#### [US-1.2] Organization Settings Management
**As an** Organization Admin
**I want to** configure organization-wide settings
**So that** I can customize the platform for my company needs

**Priority:** High
**Story Points:** 5
**Sprint:** 1

**Acceptance Criteria:**
- [ ] Given I am an org admin, when I navigate to settings, then I see all configurable options
- [ ] Given I am in settings, when I update company name, logo, or timezone, then changes are saved
- [ ] Given I update settings, when I save, then all users in the org see updated branding
- [ ] Given I am configuring settings, when I set session timeout, then all new sessions use this timeout
- [ ] Given I enable/disable features, when I save, then feature flags are updated for the org

**Technical Notes:**
- API Endpoints:
  - `GET /api/organizations/{id}/settings`
  - `PUT /api/organizations/{id}/settings`
- Settings include: Branding, security policies, feature flags, integrations
- Real-time: Broadcast settings updates to active users
- Validation: Ensure admin role before allowing changes

**Database Schema:**
```sql
-- Settings JSONB structure
{
  "branding": {
    "primary_color": "#1a73e8",
    "logo_url": "...",
    "favicon_url": "..."
  },
  "security": {
    "password_policy": {
      "min_length": 12,
      "require_uppercase": true,
      "require_numbers": true,
      "require_special": true
    },
    "session_timeout_minutes": 480,
    "mfa_required": false,
    "allowed_email_domains": ["company.com"]
  },
  "features": {
    "documents_enabled": true,
    "esignature_enabled": true,
    "workflows_enabled": false
  },
  "notifications": {
    "email_notifications": true,
    "slack_webhook": "..."
  }
}
```

**UI/UX Requirements:**
- Tabbed interface: General, Security, Features, Integrations
- Real-time preview of branding changes
- Save button with confirmation dialog
- Reset to defaults option

**Test Scenarios:**
- [ ] Happy path: Update and save settings
- [ ] Edge case: Invalid color hex code
- [ ] Edge case: Session timeout too short (< 5 min)
- [ ] Error handling: Failed to upload new logo
- [ ] Security: Non-admin tries to access settings

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

### 2. User Registration & Profile Management

#### [US-1.3] User Registration
**As a** new user invited to an organization
**I want to** create my account with email and password
**So that** I can access the platform

**Priority:** Critical
**Story Points:** 5
**Sprint:** 1

**Acceptance Criteria:**
- [ ] Given I receive an invitation email, when I click the link, then I am directed to registration page
- [ ] Given I am on registration page, when I provide email, password, and profile info, then my account is created
- [ ] Given I create an account, when the process completes, then I receive a verification email
- [ ] Given my account is created, when I verify email, then I can log in to the platform
- [ ] Given I provide a weak password, when I submit, then I see password strength requirements

**Technical Notes:**
- Supabase Auth: Use `auth.signUp()`
- Password requirements: Min 12 chars, uppercase, lowercase, number, special char
- Email verification: Required before full access
- API Endpoints:
  - `POST /api/auth/register` - Register new user
  - `POST /api/auth/verify-email` - Verify email token
- Database: Insert into `users` table with org_id
- Default role: Assign "Member" role by default

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role_id UUID REFERENCES roles(id),
  mfa_enabled BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  UNIQUE(org_id, email)
);

-- RLS Policy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view users in their org"
  ON users FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));
```

**UI/UX Requirements:**
- Registration form: Email, Password, Confirm Password, First Name, Last Name
- Real-time password strength indicator
- Email validation with regex
- Terms of service checkbox
- Clean error messages

**Test Scenarios:**
- [ ] Happy path: Complete registration and email verification
- [ ] Edge case: Email already exists in org
- [ ] Edge case: Password doesn't meet requirements
- [ ] Edge case: Expired invitation link
- [ ] Error handling: Email service unavailable
- [ ] Security: Prevent email enumeration attacks

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

#### [US-1.4] User Profile Management
**As a** logged-in user
**I want to** view and update my profile information
**So that** my details are current and accurate

**Priority:** Medium
**Story Points:** 3
**Sprint:** 1

**Acceptance Criteria:**
- [ ] Given I am logged in, when I navigate to my profile, then I see my current information
- [ ] Given I am viewing my profile, when I update name, avatar, or preferences, then changes are saved
- [ ] Given I upload a new avatar, when I save, then the image is stored and displayed
- [ ] Given I update my email, when I save, then I receive a verification email for the new address
- [ ] Given I update my timezone, when I save, then all timestamps display in my timezone

**Technical Notes:**
- API Endpoints:
  - `GET /api/users/me` - Get current user profile
  - `PUT /api/users/me` - Update profile
  - `POST /api/users/me/avatar` - Upload avatar
- Supabase Storage: Store avatars in `avatars` bucket
- Image processing: Resize to 200x200px, compress to < 100KB
- Email change: Requires re-verification

**UI/UX Requirements:**
- Profile page sections: Basic Info, Avatar, Preferences, Security
- Drag-and-drop avatar upload
- Crop tool for avatar
- Save button with loading state

**Test Scenarios:**
- [ ] Happy path: Update profile information
- [ ] Edge case: Avatar file too large (> 5MB)
- [ ] Edge case: Invalid image format
- [ ] Edge case: Change to existing email in org
- [ ] Error handling: Failed to upload avatar

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

### 3. Authentication

#### [US-1.5] Email/Password Login
**As a** registered user
**I want to** log in with my email and password
**So that** I can access the platform securely

**Priority:** Critical
**Story Points:** 3
**Sprint:** 1

**Acceptance Criteria:**
- [ ] Given I am on the login page, when I enter valid credentials, then I am logged in
- [ ] Given I log in successfully, when authenticated, then I am redirected to the dashboard
- [ ] Given I enter incorrect credentials, when I submit, then I see an error message
- [ ] Given I have MFA enabled, when I log in, then I am prompted for my OTP code
- [ ] Given I check "Remember me", when I log in, then my session persists for 30 days

**Technical Notes:**
- Supabase Auth: Use `auth.signInWithPassword()`
- Session management: JWT tokens with refresh
- Rate limiting: Max 5 failed attempts per 15 minutes
- API Endpoints:
  - `POST /api/auth/login` - Login
  - `POST /api/auth/refresh` - Refresh token
  - `POST /api/auth/logout` - Logout
- Audit: Log all login attempts (success/failure)

**Database Schema:**
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  device_info JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);
```

**UI/UX Requirements:**
- Login form: Email, Password
- "Remember me" checkbox
- "Forgot password?" link
- Show/hide password toggle
- Loading state during authentication

**Test Scenarios:**
- [ ] Happy path: Successful login
- [ ] Edge case: Incorrect password
- [ ] Edge case: Non-existent email
- [ ] Edge case: Unverified email
- [ ] Edge case: Suspended account
- [ ] Error handling: Rate limit exceeded
- [ ] Security: SQL injection in email field

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

#### [US-1.6] Password Reset
**As a** user who forgot my password
**I want to** reset my password via email
**So that** I can regain access to my account

**Priority:** High
**Story Points:** 3
**Sprint:** 1

**Acceptance Criteria:**
- [ ] Given I click "Forgot password", when I enter my email, then I receive a password reset link
- [ ] Given I receive the reset link, when I click it, then I am directed to password reset page
- [ ] Given I am on reset page, when I enter and confirm new password, then my password is updated
- [ ] Given I reset my password, when complete, then all existing sessions are invalidated
- [ ] Given I request a reset, when already requested within 5 minutes, then I see a cooldown message

**Technical Notes:**
- Supabase Auth: Use `auth.resetPasswordForEmail()`
- Reset token: Expires in 1 hour
- Rate limiting: 1 request per 5 minutes per email
- API Endpoints:
  - `POST /api/auth/forgot-password` - Request reset
  - `POST /api/auth/reset-password` - Reset with token
- Security: Invalidate all user sessions on password change

**UI/UX Requirements:**
- Forgot password page with email input
- Reset password page with new password fields
- Password strength indicator
- Success message with redirect to login

**Test Scenarios:**
- [ ] Happy path: Complete password reset flow
- [ ] Edge case: Expired reset token
- [ ] Edge case: Invalid reset token
- [ ] Edge case: Weak new password
- [ ] Error handling: Email service unavailable
- [ ] Security: Token can only be used once

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

#### [US-1.7] Multi-Factor Authentication (MFA)
**As a** security-conscious user
**I want to** enable MFA on my account
**So that** my account has an additional layer of security

**Priority:** High
**Story Points:** 8
**Sprint:** 2

**Acceptance Criteria:**
- [ ] Given I am in account settings, when I enable MFA, then I see a QR code to scan
- [ ] Given I scan the QR code, when I enter the verification code, then MFA is enabled
- [ ] Given MFA is enabled, when I log in, then I must enter my OTP code after password
- [ ] Given I enable MFA, when complete, then I receive backup codes to save
- [ ] Given I lose access to my authenticator, when I use a backup code, then I can log in

**Technical Notes:**
- Use TOTP (Time-based OTP) standard
- Library: `otplib` or Supabase native MFA
- Generate 10 backup codes (one-time use)
- API Endpoints:
  - `POST /api/auth/mfa/enable` - Start MFA setup
  - `POST /api/auth/mfa/verify` - Complete MFA setup
  - `POST /api/auth/mfa/disable` - Disable MFA
  - `POST /api/auth/mfa/verify-login` - Verify OTP during login
  - `POST /api/auth/mfa/regenerate-backup-codes` - Get new backup codes

**Database Schema:**
```sql
CREATE TABLE mfa_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('totp', 'sms')),
  secret TEXT NOT NULL, -- Encrypted
  backup_codes TEXT[], -- Encrypted, hashed codes
  enabled BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_mfa_user_type ON mfa_methods(user_id, type);
```

**UI/UX Requirements:**
- MFA setup wizard: QR Code ’ Verify ’ Backup Codes
- Display QR code with manual entry option
- Backup codes download as .txt file
- MFA status indicator on profile
- Test MFA button to verify setup

**Test Scenarios:**
- [ ] Happy path: Enable MFA and login with OTP
- [ ] Edge case: Incorrect OTP code
- [ ] Edge case: Time skew in OTP generation
- [ ] Edge case: Use backup code for login
- [ ] Edge case: Backup code already used
- [ ] Error handling: QR code fails to generate
- [ ] Security: Secret properly encrypted in database

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

#### [US-1.8] Single Sign-On (SSO)
**As an** Enterprise organization admin
**I want to** configure SSO with our identity provider
**So that** users can log in with their corporate credentials

**Priority:** Medium
**Story Points:** 13
**Sprint:** 2

**Acceptance Criteria:**
- [ ] Given I am an org admin, when I configure SSO, then I can add SAML or OAuth provider details
- [ ] Given SSO is configured, when a user clicks "Login with SSO", then they are redirected to IdP
- [ ] Given a user authenticates with IdP, when successful, then they are logged into Insign
- [ ] Given SSO is enabled, when a new user logs in via SSO, then their account is auto-provisioned
- [ ] Given SSO is required for org, when users try email/password, then they are redirected to SSO

**Technical Notes:**
- Protocols: SAML 2.0, OAuth 2.0 (Google, Microsoft, Okta)
- Just-in-time (JIT) provisioning for new users
- Attribute mapping: email, name, role from IdP claims
- API Endpoints:
  - `POST /api/organizations/{id}/sso` - Configure SSO
  - `GET /api/auth/sso/{provider}/redirect` - Initiate SSO
  - `POST /api/auth/sso/callback` - Handle SSO callback
- Test with: Google Workspace, Azure AD, Okta

**Database Schema:**
```sql
CREATE TABLE sso_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  provider TEXT NOT NULL CHECK (provider IN ('saml', 'google', 'microsoft', 'okta')),
  config JSONB NOT NULL, -- Contains IdP metadata
  enabled BOOLEAN DEFAULT TRUE,
  attribute_mapping JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Config JSONB structure for SAML
{
  "entity_id": "...",
  "sso_url": "...",
  "certificate": "...",
  "sign_requests": true
}
```

**UI/UX Requirements:**
- SSO configuration page with provider dropdown
- Step-by-step setup wizard
- Test SSO button to verify configuration
- Attribute mapping interface
- SSO status indicator

**Test Scenarios:**
- [ ] Happy path: Configure and login with Google SSO
- [ ] Edge case: Invalid SAML metadata
- [ ] Edge case: User exists in IdP but not in Insign (auto-provision)
- [ ] Edge case: User disabled in IdP
- [ ] Error handling: IdP unavailable
- [ ] Security: Verify SAML signatures

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests with test IdPs passed
- [ ] Security review completed
- [ ] Documentation updated (setup guides for each provider)
- [ ] Deployed to staging and tested

---

### 4. Role-Based Access Control (RBAC)

#### [US-1.9] Role Management
**As an** Organization Admin
**I want to** create and manage custom roles
**So that** I can control what users can do in the system

**Priority:** Critical
**Story Points:** 8
**Sprint:** 2

**Acceptance Criteria:**
- [ ] Given I am an org admin, when I navigate to roles, then I see all roles (system and custom)
- [ ] Given I am viewing roles, when I create a new role, then I can name it and assign permissions
- [ ] Given I create a role, when I save, then it appears in the roles list
- [ ] Given I edit a role, when I change permissions, then all users with that role are updated
- [ ] Given I try to delete a role, when users are assigned to it, then I see a warning

**Technical Notes:**
- System roles (cannot be deleted): Admin, Manager, Member, Guest
- Custom roles: Organization-specific
- Permissions: Resource-action pairs (e.g., documents:read, users:write)
- API Endpoints:
  - `GET /api/roles` - List roles
  - `POST /api/roles` - Create role
  - `PUT /api/roles/{id}` - Update role
  - `DELETE /api/roles/{id}` - Delete role
  - `GET /api/permissions` - List all permissions

**Database Schema:**
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource TEXT NOT NULL, -- e.g., 'documents', 'users', 'workflows'
  action TEXT NOT NULL, -- e.g., 'read', 'write', 'delete', 'admin'
  description TEXT,
  UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- Seed system permissions
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
  -- ... more permissions for other resources
;
```

**UI/UX Requirements:**
- Roles list with search and filter
- Create/Edit role modal with permission checkboxes
- Group permissions by resource
- Visual indicator for system vs custom roles
- Confirmation dialog when deleting roles

**Test Scenarios:**
- [ ] Happy path: Create custom role with specific permissions
- [ ] Edge case: Try to delete system role (should fail)
- [ ] Edge case: Create role with duplicate name
- [ ] Edge case: Delete role with assigned users
- [ ] Error handling: Invalid permission ID

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Security review completed

---

#### [US-1.10] Permission Checking
**As a** system
**I want to** enforce permissions on all actions
**So that** users can only perform authorized operations

**Priority:** Critical
**Story Points:** 5
**Sprint:** 2

**Acceptance Criteria:**
- [ ] Given a user performs an action, when checked, then system verifies they have required permission
- [ ] Given a user lacks permission, when they try an action, then they see "Access Denied" error
- [ ] Given permissions change, when applied, then user access is updated immediately
- [ ] Given an API request, when received, then permission is checked before processing
- [ ] Given a UI element requires permission, when user lacks it, then element is hidden/disabled

**Technical Notes:**
- Middleware: Permission check on all protected routes
- Helper function: `hasPermission(userId, resource, action)`
- RLS policies: Enforce at database level
- Cache: Cache user permissions for performance
- API: Return 403 Forbidden for unauthorized requests

**Implementation:**
```typescript
// Permission checking function
async function hasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  // Check cache first
  const cached = await cache.get(`permissions:${userId}`);
  if (cached) {
    return cached.includes(`${resource}:${action}`);
  }

  // Query database
  const permissions = await db
    .select('permissions.*')
    .from('users')
    .join('roles', 'roles.id', 'users.role_id')
    .join('role_permissions', 'role_permissions.role_id', 'roles.id')
    .join('permissions', 'permissions.id', 'role_permissions.permission_id')
    .where('users.id', userId);

  // Cache for 5 minutes
  await cache.set(`permissions:${userId}`, permissions, 300);

  return permissions.some(p =>
    p.resource === resource && p.action === action
  );
}

// Middleware for Express routes
function requirePermission(resource: string, action: string) {
  return async (req, res, next) => {
    const allowed = await hasPermission(req.user.id, resource, action);
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage
app.delete('/api/users/:id',
  requireAuth,
  requirePermission('users', 'delete'),
  deleteUserHandler
);
```

**UI/UX Requirements:**
- Hide UI elements user cannot access
- Show helpful message when action is forbidden
- Disable buttons user cannot click

**Test Scenarios:**
- [ ] Happy path: User with permission performs action
- [ ] Edge case: User without permission tries action (403 error)
- [ ] Edge case: User's role changes while logged in
- [ ] Edge case: Permission cache invalidation
- [ ] Security: Cannot bypass permission check with API directly
- [ ] Security: RLS policies match application-level checks

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Deployed to staging and tested

---

### 5. User Directory

#### [US-1.11] User Directory & Search
**As a** user
**I want to** browse and search for other users in my organization
**So that** I can find colleagues and see their roles

**Priority:** Medium
**Story Points:** 5
**Sprint:** 2

**Acceptance Criteria:**
- [ ] Given I am logged in, when I navigate to users, then I see a list of all users in my org
- [ ] Given I am viewing users, when I search by name or email, then results are filtered
- [ ] Given I click on a user, when viewing their profile, then I see their role and contact info
- [ ] Given I am viewing the directory, when I filter by role or department, then list updates
- [ ] Given I am a regular user, when viewing directory, then I cannot see inactive/suspended users

**Technical Notes:**
- API Endpoints:
  - `GET /api/users` - List users (with pagination)
  - `GET /api/users/{id}` - Get user details
  - `GET /api/users/search?q=query` - Search users
- Pagination: 50 users per page
- Search: Full-text search on name and email
- RLS: Only show users in same organization

**UI/UX Requirements:**
- User directory with grid or list view
- Search bar with autocomplete
- Filter sidebar: Role, Department, Status
- User card: Avatar, name, role, email
- Click to view full profile

**Test Scenarios:**
- [ ] Happy path: Browse and search users
- [ ] Edge case: Search with no results
- [ ] Edge case: Large organization (1000+ users)
- [ ] Edge case: User with no avatar
- [ ] Security: Cannot view users from other orgs

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

### 6. Session Management

#### [US-1.12] Active Session Management
**As a** user
**I want to** view and manage my active sessions
**So that** I can revoke access from devices I no longer use

**Priority:** Medium
**Story Points:** 5
**Sprint:** 2

**Acceptance Criteria:**
- [ ] Given I am in account settings, when I view sessions, then I see all my active sessions
- [ ] Given I am viewing sessions, when I see session details, then I see device, location, and last active time
- [ ] Given I select a session, when I revoke it, then that session is immediately invalidated
- [ ] Given I revoke a session, when complete, then I receive a notification email
- [ ] Given I click "Logout all devices", when confirmed, then all sessions except current are revoked

**Technical Notes:**
- API Endpoints:
  - `GET /api/users/me/sessions` - List active sessions
  - `DELETE /api/users/me/sessions/{id}` - Revoke session
  - `DELETE /api/users/me/sessions` - Revoke all sessions
- Detect device/browser from User-Agent
- GeoIP lookup for location
- WebSocket: Push logout event to revoked sessions

**UI/UX Requirements:**
- Sessions list showing device, browser, location, last active
- Current session highlighted
- Revoke button for each session
- Confirmation dialog for "Logout all"

**Test Scenarios:**
- [ ] Happy path: View and revoke a session
- [ ] Edge case: Revoke current session (logout)
- [ ] Edge case: Session already expired
- [ ] Error handling: WebSocket connection failure
- [ ] Security: Cannot revoke other user's sessions

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Security review completed

---

### 7. Audit Logging

#### [US-1.13] Authentication Audit Logging
**As a** compliance officer
**I want to** view all authentication events
**So that** I can audit security and investigate incidents

**Priority:** High
**Story Points:** 5
**Sprint:** 2

**Acceptance Criteria:**
- [ ] Given any auth event occurs, when complete, then it is logged to audit table
- [ ] Given I am an admin, when I view audit logs, then I see all auth events for my org
- [ ] Given I am viewing logs, when I filter by user, date, or event type, then results update
- [ ] Given I view a log entry, when I click it, then I see full details including IP and device
- [ ] Given I need to investigate, when I export logs, then I receive a CSV file

**Technical Notes:**
- Log all events: login, logout, login_failed, password_reset, mfa_enabled, role_changed
- Capture: timestamp, user, IP, device, action, success/failure, metadata
- API Endpoints:
  - `GET /api/audit-logs` - List logs (paginated)
  - `GET /api/audit-logs/{id}` - Get log details
  - `GET /api/audit-logs/export` - Export to CSV
- Retention: Keep logs for 1 year minimum
- Index on user_id and timestamp for performance

**Database Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- login, logout, login_failed, etc.
  resource TEXT, -- 'auth', 'users', 'documents', etc.
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_org_timestamp ON audit_logs(org_id, timestamp DESC);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- RLS Policy
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role_id IN (
        SELECT id FROM roles WHERE name = 'Admin'
      )
    )
  );
```

**UI/UX Requirements:**
- Audit log viewer with table layout
- Filters: Date range, user, event type, success/failure
- Search by IP address or user agent
- Click row to expand details
- Export button with date range selector

**Test Scenarios:**
- [ ] Happy path: View and filter audit logs
- [ ] Edge case: Large date range (performance)
- [ ] Edge case: Export with 10,000+ records
- [ ] Edge case: Failed login attempts spike
- [ ] Security: Regular users cannot access logs
- [ ] Security: Cannot modify or delete audit logs

**Definition of Done:**
- [ ] Code implemented and peer reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Security review completed
- [ ] Compliance review completed

---

## Epic Summary

### Total Story Points: 55

### Story Breakdown:
- US-1.1: Organization Creation (8 points)
- US-1.2: Organization Settings (5 points)
- US-1.3: User Registration (5 points)
- US-1.4: User Profile Management (3 points)
- US-1.5: Email/Password Login (3 points)
- US-1.6: Password Reset (3 points)
- US-1.7: Multi-Factor Authentication (8 points)
- US-1.8: Single Sign-On (13 points)
- US-1.9: Role Management (8 points)
- US-1.10: Permission Checking (5 points)
- US-1.11: User Directory (5 points)
- US-1.12: Active Session Management (5 points)
- US-1.13: Authentication Audit Logging (5 points)

### Critical Path (26 points):
1. US-1.1: Organization Creation
2. US-1.3: User Registration
3. US-1.5: Email/Password Login
4. US-1.9: Role Management
5. US-1.10: Permission Checking

### Dependencies:
- All stories depend on US-1.1 (Organization Creation)
- US-1.9 and US-1.10 must be completed before other epics
- US-1.13 (Audit Logging) should be implemented early for security

### Risks & Mitigation:
- **Risk:** SSO integration complexity ’ **Mitigation:** Start with OAuth providers first, SAML later
- **Risk:** RLS policy misconfiguration ’ **Mitigation:** Comprehensive testing, security review
- **Risk:** Performance with large organizations ’ **Mitigation:** Implement caching, pagination early

---

**Epic Owner Sign-off:** ________________
**Date:** ________________
