'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documentTags, documentTagAssignments, users, documents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation schemas
const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').default('#6b7280'),
})

const updateTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
})

const assignTagSchema = z.object({
  documentId: z.string().uuid(),
  tagId: z.string().uuid(),
})

export async function getTags() {
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

    const tags = await db.query.documentTags.findMany({
      where: eq(documentTags.orgId, currentUser.orgId),
      orderBy: (tags, { asc }) => [asc(tags.name)],
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
    })

    return { success: true, data: tags }
  } catch (error) {
    console.error('Get tags error:', error)
    return { success: false, error: 'Failed to fetch tags' }
  }
}

export async function createTag(input: z.infer<typeof createTagSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = createTagSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Check if tag name already exists in org
    const existingTag = await db.query.documentTags.findFirst({
      where: and(
        eq(documentTags.orgId, currentUser.orgId),
        eq(documentTags.name, validatedData.name)
      ),
    })

    if (existingTag) {
      return { success: false, error: 'Tag name already exists' }
    }

    const [newTag] = await db
      .insert(documentTags)
      .values({
        orgId: currentUser.orgId,
        name: validatedData.name,
        color: validatedData.color,
        createdBy: currentUser.id,
      })
      .returning()

    revalidatePath('/dashboard/documents')

    return { success: true, data: newTag }
  } catch (error) {
    console.error('Create tag error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to create tag' }
  }
}

export async function updateTag(tagId: string, input: z.infer<typeof updateTagSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = updateTagSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Verify tag belongs to org
    const tag = await db.query.documentTags.findFirst({
      where: and(
        eq(documentTags.id, tagId),
        eq(documentTags.orgId, currentUser.orgId)
      ),
    })

    if (!tag) {
      return { success: false, error: 'Tag not found' }
    }

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== tag.name) {
      const existingTag = await db.query.documentTags.findFirst({
        where: and(
          eq(documentTags.orgId, currentUser.orgId),
          eq(documentTags.name, validatedData.name)
        ),
      })

      if (existingTag) {
        return { success: false, error: 'Tag name already exists' }
      }
    }

    const [updatedTag] = await db
      .update(documentTags)
      .set(validatedData)
      .where(eq(documentTags.id, tagId))
      .returning()

    revalidatePath('/dashboard/documents')

    return { success: true, data: updatedTag }
  } catch (error) {
    console.error('Update tag error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to update tag' }
  }
}

export async function deleteTag(tagId: string) {
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

    // Verify tag belongs to org
    const tag = await db.query.documentTags.findFirst({
      where: and(
        eq(documentTags.id, tagId),
        eq(documentTags.orgId, currentUser.orgId)
      ),
    })

    if (!tag) {
      return { success: false, error: 'Tag not found' }
    }

    // Delete tag (cascade will remove assignments)
    await db.delete(documentTags).where(eq(documentTags.id, tagId))

    revalidatePath('/dashboard/documents')

    return { success: true }
  } catch (error) {
    console.error('Delete tag error:', error)
    return { success: false, error: 'Failed to delete tag' }
  }
}

export async function assignTagToDocument(input: z.infer<typeof assignTagSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = assignTagSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Verify document and tag belong to org
    const [document, tag] = await Promise.all([
      db.query.documents.findFirst({
        where: and(
          eq(documents.id, validatedData.documentId),
          eq(documents.orgId, currentUser.orgId)
        ),
      }),
      db.query.documentTags.findFirst({
        where: and(
          eq(documentTags.id, validatedData.tagId),
          eq(documentTags.orgId, currentUser.orgId)
        ),
      }),
    ])

    if (!document || !tag) {
      return { success: false, error: 'Document or tag not found' }
    }

    // Check if already assigned
    const existingAssignment = await db.query.documentTagAssignments.findFirst({
      where: and(
        eq(documentTagAssignments.documentId, validatedData.documentId),
        eq(documentTagAssignments.tagId, validatedData.tagId)
      ),
    })

    if (existingAssignment) {
      return { success: false, error: 'Tag already assigned to document' }
    }

    await db.insert(documentTagAssignments).values({
      documentId: validatedData.documentId,
      tagId: validatedData.tagId,
      assignedBy: currentUser.id,
    })

    revalidatePath('/dashboard/documents')

    return { success: true }
  } catch (error) {
    console.error('Assign tag error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to assign tag' }
  }
}

export async function removeTagFromDocument(documentId: string, tagId: string) {
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

    // Verify assignment exists and belongs to org
    const assignment = await db.query.documentTagAssignments.findFirst({
      where: and(
        eq(documentTagAssignments.documentId, documentId),
        eq(documentTagAssignments.tagId, tagId)
      ),
      with: {
        document: true,
        tag: true,
      },
    })

    if (!assignment) {
      return { success: false, error: 'Tag assignment not found' }
    }

    if (assignment.document.orgId !== currentUser.orgId || assignment.tag.orgId !== currentUser.orgId) {
      return { success: false, error: 'Unauthorized' }
    }

    await db
      .delete(documentTagAssignments)
      .where(
        and(
          eq(documentTagAssignments.documentId, documentId),
          eq(documentTagAssignments.tagId, tagId)
        )
      )

    revalidatePath('/dashboard/documents')

    return { success: true }
  } catch (error) {
    console.error('Remove tag error:', error)
    return { success: false, error: 'Failed to remove tag' }
  }
}

export async function getDocumentTags(documentId: string) {
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

    const assignments = await db.query.documentTagAssignments.findMany({
      where: eq(documentTagAssignments.documentId, documentId),
      with: {
        tag: true,
      },
    })

    const tags = assignments.map(a => a.tag)

    return { success: true, data: tags }
  } catch (error) {
    console.error('Get document tags error:', error)
    return { success: false, error: 'Failed to fetch document tags' }
  }
}
