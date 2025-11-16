'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documentShares, documents, users } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createShareSchema = z.object({
  documentId: z.string().uuid(),
  password: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  maxAccessCount: z.number().int().positive().optional(),
})

type CreateShareInput = z.infer<typeof createShareSchema>

export async function createDocumentShare(input: CreateShareInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = createShareSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Verify document belongs to org and exists
    const document = await db.query.documents.findFirst({
      where: and(
        eq(documents.id, validatedData.documentId),
        eq(documents.orgId, currentUser.orgId),
        isNull(documents.deletedAt)
      ),
    })

    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    // Generate unique share token
    const shareToken = nanoid(32)

    // Hash password if provided
    let passwordHash: string | null = null
    if (validatedData.password) {
      passwordHash = await bcrypt.hash(validatedData.password, 10)
    }

    // Create share
    const [share] = await db
      .insert(documentShares)
      .values({
        documentId: validatedData.documentId,
        shareToken,
        passwordHash,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        maxAccessCount: validatedData.maxAccessCount || null,
        createdBy: currentUser.id,
      })
      .returning()

    revalidatePath(`/dashboard/documents/${validatedData.documentId}`)

    // Generate share URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/share/${shareToken}`

    return {
      success: true,
      data: {
        ...share,
        shareUrl,
      },
    }
  } catch (error) {
    console.error('Create document share error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to create share link' }
  }
}

export async function getDocumentShares(documentId: string) {
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

    // Verify document belongs to org
    const document = await db.query.documents.findFirst({
      where: and(
        eq(documents.id, documentId),
        eq(documents.orgId, currentUser.orgId)
      ),
    })

    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    const shares = await db.query.documentShares.findMany({
      where: and(
        eq(documentShares.documentId, documentId),
        isNull(documentShares.revokedAt)
      ),
      orderBy: (documentShares, { desc }) => [desc(documentShares.createdAt)],
    })

    // Add share URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const sharesWithUrls = shares.map(share => ({
      ...share,
      shareUrl: `${baseUrl}/share/${share.shareToken}`,
    }))

    return { success: true, data: sharesWithUrls }
  } catch (error) {
    console.error('Get document shares error:', error)
    return { success: false, error: 'Failed to fetch shares' }
  }
}

export async function revokeDocumentShare(shareId: string) {
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

    // Get share and verify ownership through document
    const share = await db.query.documentShares.findFirst({
      where: eq(documentShares.id, shareId),
      with: {
        document: true,
      },
    })

    if (!share) {
      return { success: false, error: 'Share not found' }
    }

    if (share.document.orgId !== currentUser.orgId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Revoke share
    await db
      .update(documentShares)
      .set({ revokedAt: new Date() })
      .where(eq(documentShares.id, shareId))

    revalidatePath(`/dashboard/documents/${share.documentId}`)

    return { success: true }
  } catch (error) {
    console.error('Revoke document share error:', error)
    return { success: false, error: 'Failed to revoke share' }
  }
}

export async function verifyShareAccess(shareToken: string, password?: string) {
  try {
    // Find share by token
    const share = await db.query.documentShares.findFirst({
      where: eq(documentShares.shareToken, shareToken),
      with: {
        document: true,
      },
    })

    if (!share) {
      return { success: false, error: 'Invalid share link' }
    }

    // Check if revoked
    if (share.revokedAt) {
      return { success: false, error: 'This share link has been revoked' }
    }

    // Check if expired
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return { success: false, error: 'This share link has expired' }
    }

    // Check if max access count reached
    if (share.maxAccessCount && share.accessCount >= share.maxAccessCount) {
      return { success: false, error: 'This share link has reached its maximum access limit' }
    }

    // Check password if required
    if (share.passwordHash) {
      if (!password) {
        return { success: false, error: 'Password required', requiresPassword: true }
      }

      const isPasswordValid = await bcrypt.compare(password, share.passwordHash)
      if (!isPasswordValid) {
        return { success: false, error: 'Incorrect password' }
      }
    }

    // Increment access count
    await db
      .update(documentShares)
      .set({
        accessCount: share.accessCount + 1,
        lastAccessedAt: new Date(),
      })
      .where(eq(documentShares.id, share.id))

    return {
      success: true,
      data: {
        document: share.document,
        share: {
          id: share.id,
          hasPassword: !!share.passwordHash,
          expiresAt: share.expiresAt,
          accessCount: share.accessCount + 1,
          maxAccessCount: share.maxAccessCount,
        },
      },
    }
  } catch (error) {
    console.error('Verify share access error:', error)
    return { success: false, error: 'Failed to verify access' }
  }
}
