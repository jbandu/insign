import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Only use in test environment
if (process.env.NODE_ENV === 'production') {
  throw new Error('DB helpers should not be used in production');
}

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
      where: eq(schema.organizations.id, user.organizationId),
    });

    if (!org) return;

    // Delete in order (due to foreign key constraints)
    // 1. Delete user sessions
    await db.delete(schema.userSessions).where(eq(schema.userSessions.userId, user.id));

    // 2. Delete signature-related data
    await db.delete(schema.signatureAuditLogs).where(eq(schema.signatureAuditLogs.organizationId, org.id));
    await db.delete(schema.signatureCertificates).where(eq(schema.signatureCertificates.organizationId, org.id));
    await db.delete(schema.signatures).where(eq(schema.signatures.organizationId, org.id));
    await db.delete(schema.signatureFields).where(eq(schema.signatureFields.organizationId, org.id));
    await db.delete(schema.signatureParticipants).where(eq(schema.signatureParticipants.organizationId, org.id));
    await db.delete(schema.signatureRequests).where(eq(schema.signatureRequests.organizationId, org.id));

    // 3. Delete document-related data
    await db.delete(schema.documentTagAssignments).where(eq(schema.documentTagAssignments.organizationId, org.id));
    await db.delete(schema.documentTags).where(eq(schema.documentTags.organizationId, org.id));
    await db.delete(schema.documentShares).where(eq(schema.documentShares.organizationId, org.id));
    await db.delete(schema.documentPermissions).where(eq(schema.documentPermissions.organizationId, org.id));
    await db.delete(schema.documentVersions).where(eq(schema.documentVersions.organizationId, org.id));
    await db.delete(schema.documents).where(eq(schema.documents.organizationId, org.id));
    await db.delete(schema.folders).where(eq(schema.folders.organizationId, org.id));

    // 4. Delete role permissions
    const orgRoles = await db.query.roles.findMany({
      where: eq(schema.roles.organizationId, org.id),
    });
    for (const role of orgRoles) {
      await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, role.id));
    }

    // 5. Delete roles
    await db.delete(schema.roles).where(eq(schema.roles.organizationId, org.id));

    // 6. Delete users
    await db.delete(schema.users).where(eq(schema.users.organizationId, org.id));

    // 7. Delete storage quotas
    await db.delete(schema.storageQuotas).where(eq(schema.storageQuotas.organizationId, org.id));

    // 8. Delete audit logs
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.organizationId, org.id));

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
    maxStorage: 10737418240, // 10GB
  }).returning();

  // Create storage quota
  await db.insert(schema.storageQuotas).values({
    organizationId: org.id,
    totalQuota: 10737418240,
    usedStorage: 0,
  });

  // Create admin role if needed
  let role = await db.query.roles.findFirst({
    where: eq(schema.roles.name, userData.role || 'admin'),
  });

  if (!role) {
    [role] = await db.insert(schema.roles).values({
      name: userData.role || 'admin',
      organizationId: org.id,
      isSystemRole: true,
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
    organizationId: org.id,
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
    organizationId,
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
    organizationId,
    uploadedBy: userId,
    folderId: folderId || null,
    fileType: 'application/pdf',
    fileSize: 1024,
    blobUrl: 'https://example.com/test.pdf',
  }).returning();

  return document;
}
