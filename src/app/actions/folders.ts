'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { folders, users } from '@/lib/db/schema'
import { folderSchema, folderUpdateSchema, type FolderInput, type FolderUpdateInput } from '@/lib/validations/documents'
import { eq, and, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getFolders() {
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

    const foldersList = await db.query.folders.findMany({
      where: and(
        eq(folders.orgId, currentUser.orgId),
        isNull(folders.deletedAt)
      ),
      orderBy: (folders, { desc }) => [desc(folders.createdAt)],
    })

    return { success: true, data: foldersList }
  } catch (error) {
    console.error('Get folders error:', error)
    return { success: false, error: 'Failed to fetch folders' }
  }
}

export async function getFolder(folderId: string) {
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

    const folder = await db.query.folders.findFirst({
      where: and(
        eq(folders.id, folderId),
        eq(folders.orgId, currentUser.orgId),
        isNull(folders.deletedAt)
      ),
    })

    if (!folder) {
      return { success: false, error: 'Folder not found' }
    }

    return { success: true, data: folder }
  } catch (error) {
    console.error('Get folder error:', error)
    return { success: false, error: 'Failed to fetch folder' }
  }
}

export async function createFolder(input: FolderInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = folderSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Build folder path
    let path = `/${validatedData.name}`
    if (validatedData.parentId) {
      const parentFolder = await db.query.folders.findFirst({
        where: and(
          eq(folders.id, validatedData.parentId),
          eq(folders.orgId, currentUser.orgId)
        ),
      })

      if (parentFolder) {
        path = `${parentFolder.path}/${validatedData.name}`
      }
    }

    const [newFolder] = await db
      .insert(folders)
      .values({
        orgId: currentUser.orgId,
        name: validatedData.name,
        description: validatedData.description,
        parentId: validatedData.parentId,
        path,
        createdBy: currentUser.id,
      })
      .returning()

    revalidatePath('/dashboard/folders')
    revalidatePath('/dashboard/documents')

    return { success: true, data: newFolder }
  } catch (error) {
    console.error('Create folder error:', error)
    return { success: false, error: 'Failed to create folder' }
  }
}

export async function updateFolder(folderId: string, input: FolderUpdateInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = folderUpdateSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Verify folder belongs to org
    const folder = await db.query.folders.findFirst({
      where: and(
        eq(folders.id, folderId),
        eq(folders.orgId, currentUser.orgId)
      ),
    })

    if (!folder) {
      return { success: false, error: 'Folder not found' }
    }

    const [updatedFolder] = await db
      .update(folders)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, folderId))
      .returning()

    revalidatePath('/dashboard/folders')
    revalidatePath('/dashboard/documents')

    return { success: true, data: updatedFolder }
  } catch (error) {
    console.error('Update folder error:', error)
    return { success: false, error: 'Failed to update folder' }
  }
}

export async function deleteFolder(folderId: string) {
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

    // Verify folder belongs to org
    const folder = await db.query.folders.findFirst({
      where: and(
        eq(folders.id, folderId),
        eq(folders.orgId, currentUser.orgId)
      ),
    })

    if (!folder) {
      return { success: false, error: 'Folder not found' }
    }

    // Soft delete
    await db
      .update(folders)
      .set({ deletedAt: new Date() })
      .where(eq(folders.id, folderId))

    revalidatePath('/dashboard/folders')
    revalidatePath('/dashboard/documents')

    return { success: true }
  } catch (error) {
    console.error('Delete folder error:', error)
    return { success: false, error: 'Failed to delete folder' }
  }
}
