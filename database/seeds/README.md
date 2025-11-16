# Database Seed Data

Run these SQL scripts after running the initial migrations to populate your database with essential data.

## Order of Execution

1. `01_permissions.sql` - Create default permissions
2. `02_roles.sql` - Create system roles
3. `03_role_permissions.sql` - Assign permissions to roles
4. `04_demo_org.sql` - (Optional) Create demo organization and admin user

## Running Seeds

### In Neon SQL Editor:

Copy and paste each file in order, then click **Run**.

### Using psql:

```bash
psql $DATABASE_URL -f database/seeds/01_permissions.sql
psql $DATABASE_URL -f database/seeds/02_roles.sql
psql $DATABASE_URL -f database/seeds/03_role_permissions.sql
psql $DATABASE_URL -f database/seeds/04_demo_org.sql
```

## What Gets Seeded

- **Permissions**: All system permissions for resources (organizations, users, documents, etc.)
- **Roles**: Admin, Manager, Member, Guest
- **Role-Permission Mappings**: Appropriate permissions for each role
- **Demo Organization**: (Optional) Test organization with admin user
