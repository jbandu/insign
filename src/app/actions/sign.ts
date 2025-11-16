'use server'

import { db } from '@/lib/db'
import { signatures, signatureParticipants, signatureRequests, signatureFields, signatureAuditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const signatureInputSchema = z.object({
  accessToken: z.string().min(1),
  fieldId: z.string().uuid(),
  signatureData: z.string().min(1), // Base64 encoded signature image or typed text
  signatureType: z.enum(['drawn', 'typed', 'uploaded']),
  ipAddress: z.string().optional(),
})

type SignatureInput = z.infer<typeof signatureInputSchema>

export async function getSigningSession(accessToken: string) {
  try {
    // Find participant by access token
    const participant = await db.query.signatureParticipants.findFirst({
      where: eq(signatureParticipants.accessToken, accessToken),
      with: {
        request: {
          with: {
            document: true,
            participants: {
              orderBy: (participants, { asc }) => [asc(participants.orderIndex)],
            },
            fields: true,
          },
        },
      },
    })

    if (!participant) {
      return { success: false, error: 'Invalid access token' }
    }

    // Check if request is active
    if (!['sent', 'in_progress'].includes(participant.request.status)) {
      return { success: false, error: 'This signature request is no longer active' }
    }

    // Check if expired
    if (participant.request.expiresAt && new Date(participant.request.expiresAt) < new Date()) {
      return { success: false, error: 'This signature request has expired' }
    }

    // Check if participant already signed
    if (participant.status === 'signed' || participant.status === 'completed') {
      return { success: false, error: 'You have already signed this document' }
    }

    // For sequential workflow, check if it's this participant's turn
    if (participant.request.workflowType === 'sequential') {
      const previousParticipants = participant.request.participants.filter(
        p => p.orderIndex < participant.orderIndex
      )
      const allPreviousSigned = previousParticipants.every(
        p => p.status === 'signed' || p.status === 'completed'
      )
      if (!allPreviousSigned) {
        return { success: false, error: 'Please wait for previous participants to sign' }
      }
    }

    // Get fields for this participant
    const participantFields = participant.request.fields.filter(
      f => f.participantId === participant.id
    )

    // Get existing signatures for this participant
    const existingSignatures = await db.query.signatures.findMany({
      where: eq(signatures.participantId, participant.id),
    })

    return {
      success: true,
      data: {
        participant,
        request: participant.request,
        fields: participantFields,
        existingSignatures,
      },
    }
  } catch (error) {
    console.error('Get signing session error:', error)
    return { success: false, error: 'Failed to load signing session' }
  }
}

export async function createSignature(input: SignatureInput) {
  try {
    const validatedData = signatureInputSchema.parse(input)

    // Find participant by access token
    const participant = await db.query.signatureParticipants.findFirst({
      where: eq(signatureParticipants.accessToken, validatedData.accessToken),
      with: {
        request: true,
      },
    })

    if (!participant) {
      return { success: false, error: 'Invalid access token' }
    }

    // Verify field belongs to this participant
    const field = await db.query.signatureFields.findFirst({
      where: and(
        eq(signatureFields.id, validatedData.fieldId),
        eq(signatureFields.participantId, participant.id)
      ),
    })

    if (!field) {
      return { success: false, error: 'Invalid field' }
    }

    // Create signature
    const [newSignature] = await db
      .insert(signatures)
      .values({
        requestId: participant.requestId,
        participantId: participant.id,
        fieldId: validatedData.fieldId,
        signatureData: validatedData.signatureData,
        signatureType: validatedData.signatureType,
        ipAddress: validatedData.ipAddress,
      })
      .returning()

    // Log audit event
    await db.insert(signatureAuditLogs).values({
      requestId: participant.requestId,
      participantId: participant.id,
      action: 'field_signed',
      metadata: {
        fieldId: validatedData.fieldId,
        signatureType: validatedData.signatureType,
      },
    })

    revalidatePath(`/sign/${validatedData.accessToken}`)

    return { success: true, data: newSignature }
  } catch (error) {
    console.error('Create signature error:', error)
    return { success: false, error: 'Failed to save signature' }
  }
}

export async function completeSignature(accessToken: string) {
  try {
    // Find participant by access token
    const participant = await db.query.signatureParticipants.findFirst({
      where: eq(signatureParticipants.accessToken, accessToken),
      with: {
        request: {
          with: {
            participants: {
              orderBy: (participants, { asc }) => [asc(participants.orderIndex)],
            },
          },
        },
      },
    })

    if (!participant) {
      return { success: false, error: 'Invalid access token' }
    }

    // Get all required fields for this participant
    const requiredFields = await db.query.signatureFields.findMany({
      where: and(
        eq(signatureFields.participantId, participant.id),
        eq(signatureFields.isRequired, true)
      ),
    })

    // Check if all required fields are signed
    const signatures = await db.query.signatures.findMany({
      where: eq(signatures.participantId, participant.id),
    })

    const allRequiredSigned = requiredFields.every(field =>
      signatures.some(sig => sig.fieldId === field.id)
    )

    if (!allRequiredSigned) {
      return { success: false, error: 'Please complete all required fields' }
    }

    // Update participant status
    await db
      .update(signatureParticipants)
      .set({
        status: 'signed',
        signedAt: new Date(),
      })
      .where(eq(signatureParticipants.id, participant.id))

    // Log audit event
    await db.insert(signatureAuditLogs).values({
      requestId: participant.requestId,
      participantId: participant.id,
      action: 'participant_signed',
      metadata: {
        participantEmail: participant.email,
      },
    })

    // Check if all participants have signed
    const allParticipants = participant.request.participants
    const allSigned = allParticipants.every(p =>
      p.id === participant.id ? true : ['signed', 'completed'].includes(p.status)
    )

    if (allSigned) {
      // Update request status to completed
      await db
        .update(signatureRequests)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(signatureRequests.id, participant.requestId))

      // Log completion
      await db.insert(signatureAuditLogs).values({
        requestId: participant.requestId,
        action: 'request_completed',
        metadata: {
          completedAt: new Date().toISOString(),
        },
      })
    } else if (participant.request.workflowType === 'sequential') {
      // Notify next participant in sequential workflow
      const nextParticipant = allParticipants.find(
        p => p.orderIndex === participant.orderIndex + 1
      )

      if (nextParticipant) {
        await db
          .update(signatureParticipants)
          .set({
            status: 'notified',
            notifiedAt: new Date(),
          })
          .where(eq(signatureParticipants.id, nextParticipant.id))

        // Log notification
        await db.insert(signatureAuditLogs).values({
          requestId: participant.requestId,
          participantId: nextParticipant.id,
          action: 'participant_notified',
          metadata: {
            participantEmail: nextParticipant.email,
          },
        })

        // TODO: Send email notification to next participant
      }
    }

    revalidatePath(`/sign/${accessToken}`)

    return { success: true, data: { allSigned } }
  } catch (error) {
    console.error('Complete signature error:', error)
    return { success: false, error: 'Failed to complete signature' }
  }
}

export async function declineSignature(accessToken: string, reason?: string) {
  try {
    // Find participant by access token
    const participant = await db.query.signatureParticipants.findFirst({
      where: eq(signatureParticipants.accessToken, accessToken),
    })

    if (!participant) {
      return { success: false, error: 'Invalid access token' }
    }

    // Update participant status
    await db
      .update(signatureParticipants)
      .set({
        status: 'declined',
      })
      .where(eq(signatureParticipants.id, participant.id))

    // Update request status
    await db
      .update(signatureRequests)
      .set({
        status: 'declined',
        updatedAt: new Date(),
      })
      .where(eq(signatureRequests.id, participant.requestId))

    // Log audit event
    await db.insert(signatureAuditLogs).values({
      requestId: participant.requestId,
      participantId: participant.id,
      action: 'participant_declined',
      metadata: {
        participantEmail: participant.email,
        reason: reason || 'No reason provided',
      },
    })

    revalidatePath(`/sign/${accessToken}`)

    return { success: true }
  } catch (error) {
    console.error('Decline signature error:', error)
    return { success: false, error: 'Failed to decline signature' }
  }
}
