import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * Get database connection for tests
 */
export function getTestDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

/**
 * Clean up test data
 */
export async function cleanupTestData(email: string) {
  const db = getTestDb();

  try {
    // Find user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) return;

    // Find organization
    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, user.orgId),
    });

    if (!org) return;

    // Delete in order (due to foreign key constraints)
    // 1. Delete user sessions
    await db.delete(schema.userSessions).where(eq(schema.userSessions.userId, user.id));

    // 2. Delete signature requests (will cascade to related tables)
    await db.delete(schema.signatureRequests).where(eq(schema.signatureRequests.orgId, org.id));

    // 3. Delete document-related data
    await db.delete(schema.documentTags).where(eq(schema.documentTags.orgId, org.id));
    await db.delete(schema.documents).where(eq(schema.documents.orgId, org.id));
    await db.delete(schema.folders).where(eq(schema.folders.orgId, org.id));

    // 4. Delete role permissions
    const orgRoles = await db.query.roles.findMany({
      where: eq(schema.roles.orgId, org.id),
    });
    for (const role of orgRoles) {
      await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, role.id));
    }

    // 5. Delete roles
    await db.delete(schema.roles).where(eq(schema.roles.orgId, org.id));

    // 6. Delete users
    await db.delete(schema.users).where(eq(schema.users.orgId, org.id));

    // 7. Delete storage quotas
    await db.delete(schema.storageQuotas).where(eq(schema.storageQuotas.orgId, org.id));

    // 8. Delete audit logs
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.orgId, org.id));

    // 9. Delete organization
    await db.delete(schema.organizations).where(eq(schema.organizations.id, org.id));

  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

/**
 * Create test user directly in database
 */
export async function createTestUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgName: string;
  orgDomain: string;
  role?: 'admin' | 'manager' | 'member' | 'guest';
}) {
  const db = getTestDb();

  // Create organization
  const [org] = await db.insert(schema.organizations).values({
    name: userData.orgName,
    domain: userData.orgDomain,
    subscriptionTier: 'trial',
    maxUsers: 10,
    maxStorageBytes: 10737418240, // 10GB
  }).returning();

  // Create storage quota
  await db.insert(schema.storageQuotas).values({
    orgId: org.id,
    totalBytes: 10737418240,
    usedBytes: 0,
  });

  // Create admin role if needed
  let role = await db.query.roles.findFirst({
    where: eq(schema.roles.name, userData.role || 'admin'),
  });

  if (!role) {
    [role] = await db.insert(schema.roles).values({
      name: userData.role || 'admin',
      orgId: org.id,
      isSystem: true,
    }).returning();
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  // Create user
  const [user] = await db.insert(schema.users).values({
    email: userData.email,
    password: hashedPassword,
    firstName: userData.firstName,
    lastName: userData.lastName,
    orgId: org.id,
    roleId: role.id,
    status: 'active',
  }).returning();

  return { user, org, role };
}

/**
 * Create test folder
 */
export async function createTestFolder(organizationId: string, userId: string, name: string, parentId?: string) {
  const db = getTestDb();

  const [folder] = await db.insert(schema.folders).values({
    name,
    orgId: organizationId,
    createdBy: userId,
    parentId: parentId || null,
  }).returning();

  return folder;
}

/**
 * Create test document
 */
export async function createTestDocument(
  organizationId: string,
  userId: string,
  name: string,
  folderId?: string
) {
  const db = getTestDb();

  const [document] = await db.insert(schema.documents).values({
    name,
    orgId: organizationId,
    uploadedBy: userId,
    folderId: folderId || null,
    fileType: 'application/pdf',
    fileSize: 1024,
    blobUrl: 'https://example.com/test.pdf',
  }).returning();

  return document;
}
