'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { signatureAuditLogs, signatureRequests, users } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function getAuditLogs(requestId: string) {
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

    // Verify request belongs to org
    const request = await db.query.signatureRequests.findFirst({
      where: and(
        eq(signatureRequests.id, requestId),
        eq(signatureRequests.orgId, currentUser.orgId)
      ),
    })

    if (!request) {
      return { success: false, error: 'Signature request not found' }
    }

    const logs = await db.query.signatureAuditLogs.findMany({
      where: eq(signatureAuditLogs.requestId, requestId),
      orderBy: desc(signatureAuditLogs.timestamp),
    })

    return { success: true, data: logs }
  } catch (error) {
    console.error('Get audit logs error:', error)
    return { success: false, error: 'Failed to fetch audit logs' }
  }
}

export async function getAllAuditLogs() {
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

    // Get all audit logs for the organization
    const logs = await db.query.signatureAuditLogs.findMany({
      with: {
        request: {
          columns: {
            id: true,
            title: true,
            orgId: true,
          },
        },
      },
      orderBy: desc(signatureAuditLogs.timestamp),
    })

    // Filter to only include logs from this organization
    const orgLogs = logs.filter(log => log.request?.orgId === currentUser.orgId)

    return { success: true, data: orgLogs }
  } catch (error) {
    console.error('Get all audit logs error:', error)
    return { success: false, error: 'Failed to fetch audit logs' }
  }
}
