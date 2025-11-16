'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documentVersions, documents, users } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { put } from '@vercel/blob'

// Validation schemas
const createVersionSchema = z.object({
  documentId: z.string().uuid(),
  changesDescription: z.string().optional(),
})

/**
 * Get all versions for a document
 */
export async function getDocumentVersions(documentId: string) {
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

    const versions = await db.query.documentVersions.findMany({
      where: eq(documentVersions.documentId, documentId),
      with: {
        createdByUser: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [desc(documentVersions.version)],
    })

    return { success: true, data: versions }
  } catch (error) {
    console.error('Get document versions error:', error)
    return { success: false, error: 'Failed to fetch versions' }
  }
}

/**
 * Create a new version of a document
 */
export async function createDocumentVersion(
  documentId: string,
  file: File,
  changesDescription?: string
) {
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

    // Get current highest version number
    const existingVersions = await db.query.documentVersions.findMany({
      where: eq(documentVersions.documentId, documentId),
      orderBy: [desc(documentVersions.version)],
      limit: 1,
    })

    const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1

    // Upload new version to Vercel Blob
    const blob = await put(
      `documents/${currentUser.orgId}/${documentId}/v${nextVersion}_${file.name}`,
      file,
      {
        access: 'public',
        addRandomSuffix: true,
      }
    )

    // Create version record
    const [newVersion] = await db
      .insert(documentVersions)
      .values({
        documentId,
        version: nextVersion,
        filePath: blob.url,
        sizeBytes: file.size,
        mimeType: file.type,
        changesDescription: changesDescription || null,
        createdBy: currentUser.id,
      })
      .returning()

    // Update main document to point to latest version
    await db
      .update(documents)
      .set({
        filePath: blob.url,
        sizeBytes: file.size,
        mimeType: file.type,
        updatedBy: currentUser.id,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))

    revalidatePath('/dashboard/documents')

    return { success: true, data: newVersion }
  } catch (error) {
    console.error('Create document version error:', error)
    return { success: false, error: 'Failed to create version' }
  }
}

/**
 * Restore a specific version (make it the current version)
 */
export async function restoreDocumentVersion(documentId: string, versionId: string) {
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

    // Get the version to restore
    const version = await db.query.documentVersions.findFirst({
      where: and(
        eq(documentVersions.id, versionId),
        eq(documentVersions.documentId, documentId)
      ),
    })

    if (!version) {
      return { success: false, error: 'Version not found' }
    }

    // Get current highest version number
    const existingVersions = await db.query.documentVersions.findMany({
      where: eq(documentVersions.documentId, documentId),
      orderBy: [desc(documentVersions.version)],
      limit: 1,
    })

    const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1

    // Create a new version pointing to the same file
    const [newVersion] = await db
      .insert(documentVersions)
      .values({
        documentId,
        version: nextVersion,
        filePath: version.filePath,
        sizeBytes: version.sizeBytes,
        mimeType: version.mimeType,
        changesDescription: `Restored from version ${version.version}`,
        createdBy: currentUser.id,
      })
      .returning()

    // Update main document
    await db
      .update(documents)
      .set({
        filePath: version.filePath,
        sizeBytes: version.sizeBytes,
        mimeType: version.mimeType,
        updatedBy: currentUser.id,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))

    revalidatePath('/dashboard/documents')

    return { success: true, data: newVersion }
  } catch (error) {
    console.error('Restore document version error:', error)
    return { success: false, error: 'Failed to restore version' }
  }
}

/**
 * Delete a specific version
 */
export async function deleteDocumentVersion(versionId: string) {
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

    // Get the version
    const version = await db.query.documentVersions.findFirst({
      where: eq(documentVersions.id, versionId),
      with: {
        document: true,
      },
    })

    if (!version) {
      return { success: false, error: 'Version not found' }
    }

    // Verify document belongs to org
    if (version.document.orgId !== currentUser.orgId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if this is the only version
    const allVersions = await db.query.documentVersions.findMany({
      where: eq(documentVersions.documentId, version.documentId),
    })

    if (allVersions.length === 1) {
      return { success: false, error: 'Cannot delete the only version' }
    }

    // Delete the version
    await db.delete(documentVersions).where(eq(documentVersions.id, versionId))

    revalidatePath('/dashboard/documents')

    return { success: true }
  } catch (error) {
    console.error('Delete document version error:', error)
    return { success: false, error: 'Failed to delete version' }
  }
}

/**
 * Compare two versions (returns metadata for comparison)
 */
export async function compareDocumentVersions(versionId1: string, versionId2: string) {
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

    const [version1, version2] = await Promise.all([
      db.query.documentVersions.findFirst({
        where: eq(documentVersions.id, versionId1),
        with: {
          document: true,
          createdByUser: true,
        },
      }),
      db.query.documentVersions.findFirst({
        where: eq(documentVersions.id, versionId2),
        with: {
          document: true,
          createdByUser: true,
        },
      }),
    ])

    if (!version1 || !version2) {
      return { success: false, error: 'One or both versions not found' }
    }

    // Verify both versions belong to same org
    if (
      version1.document.orgId !== currentUser.orgId ||
      version2.document.orgId !== currentUser.orgId
    ) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify both versions are from same document
    if (version1.documentId !== version2.documentId) {
      return { success: false, error: 'Versions are from different documents' }
    }

    return {
      success: true,
      data: {
        version1,
        version2,
        comparison: {
          sizeDiff: version2.sizeBytes - version1.sizeBytes,
          versionDiff: version2.version - version1.version,
        },
      },
    }
  } catch (error) {
    console.error('Compare document versions error:', error)
    return { success: false, error: 'Failed to compare versions' }
  }
}
