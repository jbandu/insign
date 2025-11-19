/**
 * Complete Database Reset Script
 *
 * WARNING: This will DELETE ALL DATA from the database including users and organizations.
 * This is a DESTRUCTIVE operation and cannot be undone.
 *
 * Usage: npx tsx scripts/reset-database.ts
 */

import { db } from '../src/lib/db'
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
} from '../src/lib/db/schema'

async function resetDatabase() {
  console.log('⚠️  WARNING: Starting COMPLETE database reset...')
  console.log('This will delete ALL data including users and organizations.')
  console.log('')

  try {
    // Delete data in correct order to respect foreign key constraints
    // Start with dependent tables and work backwards

    console.log('🗑️  Deleting signature-related data...')
    await db.delete(signatureAuditLogs)
    console.log('   ✓ Deleted signature audit logs')

    await db.delete(signatures)
    console.log('   ✓ Deleted signatures')

    await db.delete(signatureFields)
    console.log('   ✓ Deleted signature fields')

    await db.delete(signatureParticipants)
    console.log('   ✓ Deleted signature participants')

    await db.delete(signatureCertificates)
    console.log('   ✓ Deleted signature certificates')

    await db.delete(signatureRequests)
    console.log('   ✓ Deleted signature requests')

    console.log('🗑️  Deleting signature template data...')
    await db.delete(signatureTemplateFields)
    console.log('   ✓ Deleted signature template fields')

    await db.delete(signatureTemplateParticipants)
    console.log('   ✓ Deleted signature template participants')

    await db.delete(signatureTemplates)
    console.log('   ✓ Deleted signature templates')

    console.log('🗑️  Deleting document-related data...')
    await db.delete(documentTagAssignments)
    console.log('   ✓ Deleted document tag assignments')

    await db.delete(documentTags)
    console.log('   ✓ Deleted document tags')

    await db.delete(documentShares)
    console.log('   ✓ Deleted document shares')

    await db.delete(documentPermissions)
    console.log('   ✓ Deleted document permissions')

    await db.delete(documentVersions)
    console.log('   ✓ Deleted document versions')

    await db.delete(documents)
    console.log('   ✓ Deleted documents')

    await db.delete(folders)
    console.log('   ✓ Deleted folders')

    console.log('🗑️  Deleting auth-related data...')
    await db.delete(verificationTokens)
    console.log('   ✓ Deleted verification tokens')

    await db.delete(sessions)
    console.log('   ✓ Deleted sessions')

    await db.delete(accounts)
    console.log('   ✓ Deleted accounts')

    await db.delete(userSessions)
    console.log('   ✓ Deleted user sessions')

    await db.delete(mfaMethods)
    console.log('   ✓ Deleted MFA methods')

    console.log('🗑️  Deleting API keys and webhooks...')
    await db.delete(apiKeys)
    console.log('   ✓ Deleted API keys')

    await db.delete(webhooks)
    console.log('   ✓ Deleted webhooks')

    console.log('🗑️  Deleting audit logs...')
    await db.delete(auditLogs)
    console.log('   ✓ Deleted audit logs')

    console.log('🗑️  Deleting SSO providers...')
    await db.delete(ssoProviders)
    console.log('   ✓ Deleted SSO providers')

    console.log('🗑️  Deleting role permissions...')
    await db.delete(rolePermissions)
    console.log('   ✓ Deleted role permissions')

    await db.delete(permissions)
    console.log('   ✓ Deleted permissions')

    await db.delete(roles)
    console.log('   ✓ Deleted roles')

    console.log('🗑️  Deleting storage quotas...')
    await db.delete(storageQuotas)
    console.log('   ✓ Deleted storage quotas')

    console.log('🗑️  Deleting users and organizations...')
    await db.delete(users)
    console.log('   ✓ Deleted users')

    await db.delete(organizations)
    console.log('   ✓ Deleted organizations')

    console.log('')
    console.log('✅ Database reset completed successfully!')
    console.log('All data has been deleted. The database is now empty.')
    console.log('')
    console.log('Next steps:')
    console.log('1. Create a new account at /auth/signup')
    console.log('2. Upload documents and create signature requests')

    process.exit(0)
  } catch (error) {
    console.error('')
    console.error('❌ Error resetting database:', error)
    console.error('')

    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack trace:', error.stack)
    }

    process.exit(1)
  }
}

// Run the reset
console.log('')
console.log('═══════════════════════════════════════════════════════')
console.log('         DATABASE COMPLETE RESET SCRIPT')
console.log('═══════════════════════════════════════════════════════')
console.log('')

resetDatabase()
