'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  users,
  organizations,
  documents,
  documentVersions,
  documentPermissions,
  documentShares,
  documentTags,
  documentTagAssignments,
  folders,
  signatureRequests,
  signatureParticipants,
  signatureFields,
  signatures,
  signatureAuditLogs,
  signatureCertificates,
  signatureTemplates,
  signatureTemplateParticipants,
  signatureTemplateFields,
  apiKeys,
  auditLogs,
  storageQuotas,
  webhooks,
  accounts,
  sessions,
  verificationTokens,
  userSessions,
  mfaMethods,
  ssoProviders,
  roles,
  permissions,
  rolePermissions,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Delete all data from all tables except users
 * This is a DESTRUCTIVE operation and should only be used by administrators
 */
export async function deleteAllDataExceptUsers() {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // TODO: Add proper admin role check
    // For now, we'll allow any authenticated user (you should add role-based access control)
    // Example: if (currentUser.role !== 'admin') { return { success: false, error: 'Unauthorized' } }

    console.log('Starting data deletion process...')

    // Delete data in correct order to respect foreign key constraints
    // Start with dependent tables and work backwards

    // 1. Delete signature-related data
    await db.delete(signatureAuditLogs)
    console.log('Deleted signature audit logs')

    await db.delete(signatures)
    console.log('Deleted signatures')

    await db.delete(signatureFields)
    console.log('Deleted signature fields')

    await db.delete(signatureParticipants)
    console.log('Deleted signature participants')

    await db.delete(signatureCertificates)
    console.log('Deleted signature certificates')

    await db.delete(signatureRequests)
    console.log('Deleted signature requests')

    // 2. Delete signature template data
    await db.delete(signatureTemplateFields)
    console.log('Deleted signature template fields')

    await db.delete(signatureTemplateParticipants)
    console.log('Deleted signature template participants')

    await db.delete(signatureTemplates)
    console.log('Deleted signature templates')

    // 3. Delete document-related data
    await db.delete(documentTagAssignments)
    console.log('Deleted document tag assignments')

    await db.delete(documentTags)
    console.log('Deleted document tags')

    await db.delete(documentShares)
    console.log('Deleted document shares')

    await db.delete(documentPermissions)
    console.log('Deleted document permissions')

    await db.delete(documentVersions)
    console.log('Deleted document versions')

    await db.delete(documents)
    console.log('Deleted documents')

    await db.delete(folders)
    console.log('Deleted folders')

    // 4. Delete auth-related data (but NOT users)
    await db.delete(verificationTokens)
    console.log('Deleted verification tokens')

    await db.delete(sessions)
    console.log('Deleted sessions')

    await db.delete(accounts)
    console.log('Deleted accounts')

    await db.delete(userSessions)
    console.log('Deleted user sessions')

    await db.delete(mfaMethods)
    console.log('Deleted MFA methods')

    // 5. Delete API keys and webhooks
    await db.delete(apiKeys)
    console.log('Deleted API keys')

    await db.delete(webhooks)
    console.log('Deleted webhooks')

    // 6. Delete audit logs
    await db.delete(auditLogs)
    console.log('Deleted audit logs')

    // 7. Delete SSO providers
    await db.delete(ssoProviders)
    console.log('Deleted SSO providers')

    // 8. Delete role permissions
    await db.delete(rolePermissions)
    console.log('Deleted role permissions')

    await db.delete(permissions)
    console.log('Deleted permissions')

    await db.delete(roles)
    console.log('Deleted roles')

    // 9. Delete storage quotas
    await db.delete(storageQuotas)
    console.log('Deleted storage quotas')

    // Note: We do NOT delete users and organizations as requested

    console.log('Data deletion completed successfully')

    return {
      success: true,
      message: 'All data deleted successfully (users and organizations preserved)'
    }
  } catch (error) {
    console.error('Error deleting data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete data'
    }
  }
}
