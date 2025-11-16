# Database Migrations

This directory contains SQL migration files for the Insign database.

## How to Run Migrations in Neon

### Option 1: Using Neon SQL Editor (Recommended)

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Copy the contents of the migration file
5. Paste into the SQL Editor
6. Click **Run**

### Option 2: Using Drizzle Kit (From Local Machine)

```bash
# Install dependencies
npm install

# Push schema to Neon
npx drizzle-kit push

# Or run migrations
npx drizzle-kit migrate
```

## Migration Files

- **0000_initial_schema.sql** - Complete initial database schema
  - 26 tables including organizations, users, documents, signatures
  - All enums, constraints, and foreign keys
  - Ready for production use

## Database Schema Overview

### Core Tables
- `organizations` - Multi-tenant organization management
- `users` - User accounts with RBAC
- `roles` - Role definitions
- `permissions` - Granular permissions
- `role_permissions` - Role-permission mappings

### Authentication
- `accounts` - OAuth provider accounts (NextAuth)
- `sessions` - User sessions (NextAuth)
- `verification_tokens` - Email verification tokens
- `user_sessions` - Custom session tracking
- `mfa_methods` - Multi-factor authentication
- `sso_providers` - SSO provider configurations

### Document Management
- `folders` - Hierarchical folder structure
- `documents` - Document metadata and storage
- `document_versions` - Version history
- `document_permissions` - Access control
- `document_shares` - Public sharing links
- `document_tags` - Document tagging system
- `document_tag_assignments` - Tag assignments

### E-Signatures
- `signature_requests` - Signature workflow requests
- `signature_participants` - Workflow participants
- `signature_fields` - Field placements on documents
- `signatures` - Captured signatures
- `signature_audit_logs` - Complete audit trail
- `signature_certificates` - Completion certificates

### System
- `audit_logs` - System-wide audit logging
- `storage_quotas` - Organization storage tracking

## Connection String Format

```
postgresql://username:password@host/database?sslmode=require
```

Example for Neon:
```
postgresql://neondb_owner:password@ep-xxx.aws.neon.tech/neondb?sslmode=require
```

## Troubleshooting

If you get errors:
- Ensure tables don't already exist (or use `DROP TABLE IF EXISTS` first)
- Check your database permissions
- Verify connection string is correct
- Make sure you're connected to the right database

## Next Steps After Migration

1. Verify all tables were created:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

2. Check table counts (should be 26):
   ```sql
   SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

3. Seed initial data (see `/database/seeds/`)
