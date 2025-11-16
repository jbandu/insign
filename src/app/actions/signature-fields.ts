'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { signatureFields, signatureRequests, signatureParticipants, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const signatureFieldSchema = z.object({
  requestId: z.string().uuid(),
  participantId: z.string().uuid(),
  fieldType: z.enum(['signature', 'initials', 'date', 'text', 'checkbox']),
  pageNumber: z.number().int().min(1),
  positionX: z.number().min(0),
  positionY: z.number().min(0),
  width: z.number().min(10),
  height: z.number().min(10),
  isRequired: z.boolean().default(true),
})

type SignatureFieldInput = z.infer<typeof signatureFieldSchema>

export async function createSignatureField(input: SignatureFieldInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = signatureFieldSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Verify request belongs to org and is in draft status
    const request = await db.query.signatureRequests.findFirst({
      where: and(
        eq(signatureRequests.id, validatedData.requestId),
        eq(signatureRequests.orgId, currentUser.orgId)
      ),
    })

    if (!request) {
      return { success: false, error: 'Signature request not found' }
    }

    if (request.status !== 'draft') {
      return { success: false, error: 'Cannot modify fields after request is sent' }
    }

    // Verify participant belongs to request
    const participant = await db.query.signatureParticipants.findFirst({
      where: and(
        eq(signatureParticipants.id, validatedData.participantId),
        eq(signatureParticipants.requestId, validatedData.requestId)
      ),
    })

    if (!participant) {
      return { success: false, error: 'Participant not found' }
    }

    const [newField] = await db
      .insert(signatureFields)
      .values({
        requestId: validatedData.requestId,
        participantId: validatedData.participantId,
        type: validatedData.fieldType,
        pageNumber: validatedData.pageNumber,
        x: validatedData.positionX,
        y: validatedData.positionY,
        width: validatedData.width,
        height: validatedData.height,
        required: validatedData.isRequired,
      })
      .returning()

    revalidatePath(`/dashboard/signatures/${validatedData.requestId}`)

    return { success: true, data: newField }
  } catch (error) {
    console.error('Create signature field error:', error)
    return { success: false, error: 'Failed to create signature field' }
  }
}

export async function updateSignatureField(
  fieldId: string,
  input: Partial<SignatureFieldInput>
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

    // Get the field and verify access
    const field = await db.query.signatureFields.findFirst({
      where: eq(signatureFields.id, fieldId),
      with: {
        request: true,
      },
    })

    if (!field) {
      return { success: false, error: 'Field not found' }
    }

    if (field.request.orgId !== currentUser.orgId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (field.request.status !== 'draft') {
      return { success: false, error: 'Cannot modify fields after request is sent' }
    }

    const [updatedField] = await db
      .update(signatureFields)
      .set(input)
      .where(eq(signatureFields.id, fieldId))
      .returning()

    revalidatePath(`/dashboard/signatures/${field.requestId}`)

    return { success: true, data: updatedField }
  } catch (error) {
    console.error('Update signature field error:', error)
    return { success: false, error: 'Failed to update signature field' }
  }
}

export async function deleteSignatureField(fieldId: string) {
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

    // Get the field and verify access
    const field = await db.query.signatureFields.findFirst({
      where: eq(signatureFields.id, fieldId),
      with: {
        request: true,
      },
    })

    if (!field) {
      return { success: false, error: 'Field not found' }
    }

    if (field.request.orgId !== currentUser.orgId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (field.request.status !== 'draft') {
      return { success: false, error: 'Cannot modify fields after request is sent' }
    }

    await db.delete(signatureFields).where(eq(signatureFields.id, fieldId))

    revalidatePath(`/dashboard/signatures/${field.requestId}`)

    return { success: true }
  } catch (error) {
    console.error('Delete signature field error:', error)
    return { success: false, error: 'Failed to delete signature field' }
  }
}

export async function getSignatureFields(requestId: string) {
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

    const fields = await db.query.signatureFields.findMany({
      where: eq(signatureFields.requestId, requestId),
      with: {
        participant: true,
      },
    })

    return { success: true, data: fields }
  } catch (error) {
    console.error('Get signature fields error:', error)
    return { success: false, error: 'Failed to fetch signature fields' }
  }
}
