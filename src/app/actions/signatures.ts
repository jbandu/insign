'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { signatureRequests, signatureParticipants, signatureFields, signatures, signatureAuditLogs, documents, users } from '@/lib/db/schema'
import { signatureRequestSchema, signatureRequestUpdateSchema, type SignatureRequestInput, type SignatureRequestUpdateInput } from '@/lib/validations/signatures'
import { eq, and, or, isNull, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { sendEmail, generateSignatureRequestEmail } from '@/lib/email'
import { triggerOrgWebhooks } from './webhooks'

export async function getSignatureRequests() {
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

    const requests = await db.query.signatureRequests.findMany({
      where: eq(signatureRequests.orgId, currentUser.orgId),
      with: {
        document: true,
        participants: true,
      },
      orderBy: desc(signatureRequests.createdAt),
    })

    return { success: true, data: requests }
  } catch (error) {
    console.error('Get signature requests error:', error)
    return { success: false, error: 'Failed to fetch signature requests' }
  }
}

export async function getSignatureRequest(requestId: string) {
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

    const request = await db.query.signatureRequests.findFirst({
      where: and(
        eq(signatureRequests.id, requestId),
        eq(signatureRequests.orgId, currentUser.orgId)
      ),
      with: {
        document: true,
        participants: {
          orderBy: (participants, { asc }) => [asc(participants.orderIndex)],
        },
        fields: true,
      },
    })

    if (!request) {
      return { success: false, error: 'Signature request not found' }
    }

    return { success: true, data: request }
  } catch (error) {
    console.error('Get signature request error:', error)
    return { success: false, error: 'Failed to fetch signature request' }
  }
}

export async function createSignatureRequest(input: SignatureRequestInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = signatureRequestSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Verify document exists and belongs to org
    const document = await db.query.documents.findFirst({
      where: and(
        eq(documents.id, validatedData.documentId),
        eq(documents.orgId, currentUser.orgId)
      ),
    })

    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    // Create signature request
    const [newRequest] = await db
      .insert(signatureRequests)
      .values({
        orgId: currentUser.orgId,
        documentId: validatedData.documentId,
        title: validatedData.title,
        message: validatedData.message,
        workflowType: validatedData.workflowType,
        expiresAt: validatedData.expiresAt,
        status: 'draft',
        createdBy: currentUser.id,
      })
      .returning()

    // Create participants
    const participantsData = validatedData.participants.map((p) => ({
      requestId: newRequest.id,
      email: p.email,
      fullName: p.fullName,
      role: p.role,
      orderIndex: p.orderIndex,
      accessToken: nanoid(32),
      status: 'pending' as const,
    }))

    const createdParticipants = await db.insert(signatureParticipants).values(participantsData).returning()

    // Log audit event
    await db.insert(signatureAuditLogs).values({
      requestId: newRequest.id,
      action: 'request_created',
      metadata: { title: validatedData.title },
    })

    revalidatePath('/dashboard/signatures')

    return {
      success: true,
      data: {
        ...newRequest,
        participants: createdParticipants
      }
    }
  } catch (error) {
    console.error('Create signature request error:', error)
    return { success: false, error: 'Failed to create signature request' }
  }
}

export async function updateSignatureRequest(requestId: string, input: SignatureRequestUpdateInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = signatureRequestUpdateSchema.parse(input)

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

    const [updatedRequest] = await db
      .update(signatureRequests)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(signatureRequests.id, requestId))
      .returning()

    // Log audit event
    await db.insert(signatureAuditLogs).values({
      requestId: requestId,
      action: 'request_updated',
      metadata: validatedData,
    })

    revalidatePath('/dashboard/signatures')

    return { success: true, data: updatedRequest }
  } catch (error) {
    console.error('Update signature request error:', error)
    return { success: false, error: 'Failed to update signature request' }
  }
}

export async function sendSignatureRequest(requestId: string) {
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
      with: {
        document: true,
        participants: {
          orderBy: (participants, { asc }) => [asc(participants.orderIndex)],
        },
      },
    })

    if (!request) {
      return { success: false, error: 'Signature request not found' }
    }

    if (request.status !== 'draft') {
      return { success: false, error: 'Request already sent' }
    }

    // Update request status
    await db
      .update(signatureRequests)
      .set({
        status: 'sent',
        updatedAt: new Date(),
      })
      .where(eq(signatureRequests.id, requestId))

    // Notify first participant(s) based on workflow type
    const participantsToNotify = request.workflowType === 'sequential'
      ? [request.participants[0]] // Only first participant
      : request.participants // All participants

    // Update participant status to notified and send emails
    for (const participant of participantsToNotify) {
      await db
        .update(signatureParticipants)
        .set({
          status: 'notified',
          notifiedAt: new Date(),
        })
        .where(eq(signatureParticipants.id, participant.id))

      // Send email notification
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const signingUrl = `${baseUrl}/sign/${participant.accessToken}`

      const emailHtml = generateSignatureRequestEmail({
        recipientName: participant.fullName || participant.email,
        senderName: currentUser.firstName && currentUser.lastName
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : currentUser.email,
        documentName: request.document.name,
        requestTitle: request.title,
        message: request.message || undefined,
        signingUrl,
        expiresAt: request.expiresAt || undefined,
      })

      await sendEmail({
        to: participant.email,
        subject: `Signature Request: ${request.title}`,
        html: emailHtml,
      })
    }

    // Log audit event
    await db.insert(signatureAuditLogs).values({
      requestId: requestId,
      action: 'request_sent',
      metadata: {
        workflowType: request.workflowType,
        participantCount: participantsToNotify.length,
      },
    })

    // Trigger webhooks
    await triggerOrgWebhooks(currentUser.orgId, 'signature_request.sent', {
      requestId: request.id,
      title: request.title,
      documentName: request.document.name,
      workflowType: request.workflowType,
      participantCount: participantsToNotify.length,
    })

    revalidatePath('/dashboard/signatures')

    return {
      success: true,
      data: {
        requestId,
        notifiedParticipants: participantsToNotify.length,
      },
    }
  } catch (error) {
    console.error('Send signature request error:', error)
    return { success: false, error: 'Failed to send signature request' }
  }
}

export async function cancelSignatureRequest(requestId: string) {
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

    if (request.status === 'completed' || request.status === 'cancelled') {
      return { success: false, error: 'Cannot cancel this request' }
    }

    await db
      .update(signatureRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(signatureRequests.id, requestId))

    // Log audit event
    await db.insert(signatureAuditLogs).values({
      requestId: requestId,
      action: 'request_cancelled',
      metadata: { cancelledBy: currentUser.id },
    })

    revalidatePath('/dashboard/signatures')

    return { success: true }
  } catch (error) {
    console.error('Cancel signature request error:', error)
    return { success: false, error: 'Failed to cancel signature request' }
  }
}

export async function deleteSignatureRequest(requestId: string) {
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

    // Verify request belongs to org and is in draft status
    const request = await db.query.signatureRequests.findFirst({
      where: and(
        eq(signatureRequests.id, requestId),
        eq(signatureRequests.orgId, currentUser.orgId)
      ),
    })

    if (!request) {
      return { success: false, error: 'Signature request not found' }
    }

    if (request.status !== 'draft') {
      return { success: false, error: 'Can only delete draft requests' }
    }

    // Delete request (cascade will handle participants and fields)
    await db.delete(signatureRequests).where(eq(signatureRequests.id, requestId))

    revalidatePath('/dashboard/signatures')

    return { success: true }
  } catch (error) {
    console.error('Delete signature request error:', error)
    return { success: false, error: 'Failed to delete signature request' }
  }
}
