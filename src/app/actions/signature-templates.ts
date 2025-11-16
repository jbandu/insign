'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  signatureTemplates,
  signatureTemplateParticipants,
  signatureTemplateFields,
  users,
} from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation schemas
const participantSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  role: z.enum(['signer', 'approver', 'cc']).default('signer'),
  order: z.number().int().positive().default(1),
})

const fieldSchema = z.object({
  participantLabel: z.string().min(1, 'Participant label is required'),
  type: z.enum(['signature', 'initials', 'date', 'text', 'checkbox', 'dropdown']),
  pageNumber: z.number().int().positive().default(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  required: z.boolean().default(true),
})

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  workflowType: z.enum(['sequential', 'parallel']).default('sequential'),
  message: z.string().optional(),
  participants: z.array(participantSchema).min(1, 'At least one participant is required'),
  fields: z.array(fieldSchema).optional(),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  workflowType: z.enum(['sequential', 'parallel']).optional(),
  message: z.string().optional(),
})

/**
 * Get all templates for the organization
 */
export async function getSignatureTemplates() {
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

    const templates = await db.query.signatureTemplates.findMany({
      where: eq(signatureTemplates.orgId, currentUser.orgId),
      with: {
        createdByUser: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        participants: {
          orderBy: (participants, { asc }) => [asc(participants.order)],
        },
        fields: true,
      },
      orderBy: [desc(signatureTemplates.createdAt)],
    })

    return { success: true, data: templates }
  } catch (error) {
    console.error('Get templates error:', error)
    return { success: false, error: 'Failed to fetch templates' }
  }
}

/**
 * Get a single template by ID
 */
export async function getSignatureTemplate(templateId: string) {
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

    const template = await db.query.signatureTemplates.findFirst({
      where: and(
        eq(signatureTemplates.id, templateId),
        eq(signatureTemplates.orgId, currentUser.orgId)
      ),
      with: {
        createdByUser: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        participants: {
          orderBy: (participants, { asc }) => [asc(participants.order)],
        },
        fields: true,
      },
    })

    if (!template) {
      return { success: false, error: 'Template not found' }
    }

    return { success: true, data: template }
  } catch (error) {
    console.error('Get template error:', error)
    return { success: false, error: 'Failed to fetch template' }
  }
}

/**
 * Create a new signature template
 */
export async function createSignatureTemplate(input: z.infer<typeof createTemplateSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = createTemplateSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Create the template
    const [newTemplate] = await db
      .insert(signatureTemplates)
      .values({
        orgId: currentUser.orgId,
        name: validatedData.name,
        description: validatedData.description || null,
        workflowType: validatedData.workflowType,
        message: validatedData.message || null,
        createdBy: currentUser.id,
      })
      .returning()

    // Create participants
    if (validatedData.participants.length > 0) {
      await db.insert(signatureTemplateParticipants).values(
        validatedData.participants.map((p) => ({
          templateId: newTemplate.id,
          label: p.label,
          role: p.role,
          order: p.order,
        }))
      )
    }

    // Create fields if provided
    if (validatedData.fields && validatedData.fields.length > 0) {
      await db.insert(signatureTemplateFields).values(
        validatedData.fields.map((f) => ({
          templateId: newTemplate.id,
          participantLabel: f.participantLabel,
          type: f.type,
          pageNumber: f.pageNumber,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          required: f.required,
        }))
      )
    }

    revalidatePath('/dashboard/signatures/templates')

    return { success: true, data: newTemplate }
  } catch (error) {
    console.error('Create template error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to create template' }
  }
}

/**
 * Update a template
 */
export async function updateSignatureTemplate(
  templateId: string,
  input: z.infer<typeof updateTemplateSchema>
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = updateTemplateSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Verify template belongs to org
    const template = await db.query.signatureTemplates.findFirst({
      where: and(
        eq(signatureTemplates.id, templateId),
        eq(signatureTemplates.orgId, currentUser.orgId)
      ),
    })

    if (!template) {
      return { success: false, error: 'Template not found' }
    }

    // Update template
    const [updatedTemplate] = await db
      .update(signatureTemplates)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(signatureTemplates.id, templateId))
      .returning()

    revalidatePath('/dashboard/signatures/templates')

    return { success: true, data: updatedTemplate }
  } catch (error) {
    console.error('Update template error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to update template' }
  }
}

/**
 * Delete a template
 */
export async function deleteSignatureTemplate(templateId: string) {
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

    // Verify template belongs to org
    const template = await db.query.signatureTemplates.findFirst({
      where: and(
        eq(signatureTemplates.id, templateId),
        eq(signatureTemplates.orgId, currentUser.orgId)
      ),
    })

    if (!template) {
      return { success: false, error: 'Template not found' }
    }

    // Delete template (cascade will delete participants and fields)
    await db.delete(signatureTemplates).where(eq(signatureTemplates.id, templateId))

    revalidatePath('/dashboard/signatures/templates')

    return { success: true }
  } catch (error) {
    console.error('Delete template error:', error)
    return { success: false, error: 'Failed to delete template' }
  }
}

/**
 * Duplicate a template
 */
export async function duplicateSignatureTemplate(templateId: string) {
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

    // Get the template with all its data
    const template = await db.query.signatureTemplates.findFirst({
      where: and(
        eq(signatureTemplates.id, templateId),
        eq(signatureTemplates.orgId, currentUser.orgId)
      ),
      with: {
        participants: true,
        fields: true,
      },
    })

    if (!template) {
      return { success: false, error: 'Template not found' }
    }

    // Create new template
    const [newTemplate] = await db
      .insert(signatureTemplates)
      .values({
        orgId: currentUser.orgId,
        name: `${template.name} (Copy)`,
        description: template.description,
        workflowType: template.workflowType,
        message: template.message,
        createdBy: currentUser.id,
      })
      .returning()

    // Copy participants
    if (template.participants.length > 0) {
      await db.insert(signatureTemplateParticipants).values(
        template.participants.map((p) => ({
          templateId: newTemplate.id,
          label: p.label,
          role: p.role,
          order: p.order,
        }))
      )
    }

    // Copy fields
    if (template.fields.length > 0) {
      await db.insert(signatureTemplateFields).values(
        template.fields.map((f) => ({
          templateId: newTemplate.id,
          participantLabel: f.participantLabel,
          type: f.type,
          pageNumber: f.pageNumber,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          required: f.required,
        }))
      )
    }

    revalidatePath('/dashboard/signatures/templates')

    return { success: true, data: newTemplate }
  } catch (error) {
    console.error('Duplicate template error:', error)
    return { success: false, error: 'Failed to duplicate template' }
  }
}
