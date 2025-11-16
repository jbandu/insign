'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documents, users, storageQuotas } from '@/lib/db/schema'
import { documentUpdateSchema, type DocumentUpdateInput } from '@/lib/validations/documents'
import { eq, and, isNull, or, ilike, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'

export async function getDocuments(search?: string, folderId?: string) {
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

    let whereConditions = and(
      eq(documents.orgId, currentUser.orgId),
      isNull(documents.deletedAt)
    )

    // Add folder filter
    if (folderId) {
      whereConditions = and(whereConditions, eq(documents.folderId, folderId))
    }

    // Add search filter
    if (search) {
      whereConditions = and(
        whereConditions,
        or(
          ilike(documents.name, `%${search}%`),
          ilike(documents.contentText, `%${search}%`)
        )
      )
    }

    const documentsList = await db.query.documents.findMany({
      where: whereConditions,
      with: {
        folder: true,
      },
      orderBy: (documents, { desc }) => [desc(documents.createdAt)],
    })

    return { success: true, data: documentsList }
  } catch (error) {
    console.error('Get documents error:', error)
    return { success: false, error: 'Failed to fetch documents' }
  }
}

export async function getDocument(documentId: string) {
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

    const document = await db.query.documents.findFirst({
      where: and(
        eq(documents.id, documentId),
        eq(documents.orgId, currentUser.orgId),
        isNull(documents.deletedAt)
      ),
      with: {
        folder: true,
      },
    })

    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    return { success: true, data: document }
  } catch (error) {
    console.error('Get document error:', error)
    return { success: false, error: 'Failed to fetch document' }
  }
}

export async function uploadDocument(formData: FormData) {
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

    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const folderId = formData.get('folderId') as string | null

    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Check storage quota
    const quota = await db.query.storageQuotas.findFirst({
      where: eq(storageQuotas.orgId, currentUser.orgId),
    })

    if (quota && (quota.usedBytes + file.size) > quota.totalBytes) {
      return { success: false, error: 'Storage quota exceeded' }
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    // Create document record
    const [newDocument] = await db
      .insert(documents)
      .values({
        orgId: currentUser.orgId,
        name: name || file.name,
        filePath: blob.url,
        mimeType: file.type,
        sizeBytes: file.size,
        folderId: folderId || null,
        createdBy: currentUser.id,
      })
      .returning()

    // Update storage quota
    if (quota) {
      await db
        .update(storageQuotas)
        .set({
          usedBytes: quota.usedBytes + file.size,
          updatedAt: new Date(),
        })
        .where(eq(storageQuotas.orgId, currentUser.orgId))
    }

    revalidatePath('/dashboard/documents')

    return { success: true, data: newDocument }
  } catch (error) {
    console.error('Upload document error:', error)
    return { success: false, error: 'Failed to upload document' }
  }
}

export async function updateDocument(documentId: string, input: DocumentUpdateInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = documentUpdateSchema.parse(input)

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

    const [updatedDocument] = await db
      .update(documents)
      .set({
        ...validatedData,
        updatedBy: currentUser.id,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning()

    revalidatePath('/dashboard/documents')

    return { success: true, data: updatedDocument }
  } catch (error) {
    console.error('Update document error:', error)
    return { success: false, error: 'Failed to update document' }
  }
}

export async function deleteDocument(documentId: string) {
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

    // Soft delete
    await db
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(eq(documents.id, documentId))

    // Update storage quota
    const quota = await db.query.storageQuotas.findFirst({
      where: eq(storageQuotas.orgId, currentUser.orgId),
    })

    if (quota) {
      await db
        .update(storageQuotas)
        .set({
          usedBytes: Math.max(0, quota.usedBytes - document.sizeBytes),
          updatedAt: new Date(),
        })
        .where(eq(storageQuotas.orgId, currentUser.orgId))
    }

    revalidatePath('/dashboard/documents')

    return { success: true }
  } catch (error) {
    console.error('Delete document error:', error)
    return { success: false, error: 'Failed to delete document' }
  }
}

export async function getStorageUsage() {
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

    const quota = await db.query.storageQuotas.findFirst({
      where: eq(storageQuotas.orgId, currentUser.orgId),
    })

    if (!quota) {
      return {
        success: true,
        data: {
          usedBytes: 0,
          totalBytes: 10737418240, // 10GB default
          percentage: 0,
        },
      }
    }

    return {
      success: true,
      data: {
        usedBytes: quota.usedBytes,
        totalBytes: quota.totalBytes,
        percentage: (quota.usedBytes / quota.totalBytes) * 100,
      },
    }
  } catch (error) {
    console.error('Get storage usage error:', error)
    return { success: false, error: 'Failed to fetch storage usage' }
  }
}
