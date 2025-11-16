'use server'

import { db } from '@/lib/db'
import { signatures, signatureParticipants, signatureRequests, signatureFields, signatureAuditLogs, users } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sendEmail, generateSignatureRequestEmail, generateSignatureCompletedEmail, generateAllSignaturesCompletedEmail } from '@/lib/email'
import { triggerOrgWebhooks } from './webhooks'

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
              orderBy: asc(signatureParticipants.orderIndex),
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
    if (!participant.request.status || !['sent', 'in_progress'].includes(participant.request.status)) {
      const statusMessage = participant.request.status === 'declined'
        ? 'This signature request has been declined'
        : participant.request.status === 'completed'
        ? 'This signature request has already been completed'
        : 'This signature request is no longer active'
      return { success: false, error: statusMessage }
    }

    // Check if expired
    if (participant.request.expiresAt && new Date(participant.request.expiresAt) < new Date()) {
      return { success: false, error: 'This signature request has expired' }
    }

    // Check if participant already signed
    if (participant.status === 'signed') {
      return { success: false, error: 'You have already signed this document' }
    }

    // For sequential workflow, check if it's this participant's turn
    if (participant.request.workflowType === 'sequential') {
      const previousParticipants = participant.request.participants.filter(
        p => p.orderIndex < participant.orderIndex
      )
      const allPreviousSigned = previousParticipants.every(
        p => p.status === 'signed'
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
        participantId: participant.id,
        fieldId: validatedData.fieldId,
        signatureData: validatedData.signatureData,
        signatureType: validatedData.signatureType,
        ipAddress: validatedData.ipAddress || '0.0.0.0',
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
            document: true,
            participants: {
              orderBy: asc(signatureParticipants.orderIndex),
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
        eq(signatureFields.required, true)
      ),
    })

    // Check if all required fields are signed
    const existingSignatures = await db.query.signatures.findMany({
      where: eq(signatures.participantId, participant.id),
    })

    const allRequiredSigned = requiredFields.every(field =>
      existingSignatures.some(sig => sig.fieldId === field.id)
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
      p.id === participant.id ? true : p.status === 'signed'
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

      // Get the request creator to send them completion notification
      const creator = await db.query.users.findFirst({
        where: eq(users.id, participant.request.createdBy),
      })

      if (creator) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const dashboardUrl = `${baseUrl}/dashboard/signatures/${participant.requestId}`

        const emailHtml = generateAllSignaturesCompletedEmail({
          recipientName: creator.firstName && creator.lastName
            ? `${creator.firstName} ${creator.lastName}`
            : creator.email,
          documentName: participant.request.document.name,
          requestTitle: participant.request.title,
          participantCount: allParticipants.length,
          completedAt: new Date(),
          dashboardUrl,
        })

        await sendEmail({
          to: creator.email,
          subject: `All Signatures Completed: ${participant.request.title}`,
          html: emailHtml,
        })
      }

      // Notify all other participants that the document is fully executed
      for (const otherParticipant of allParticipants) {
        if (otherParticipant.id !== participant.id) {
          const emailHtml = generateSignatureCompletedEmail({
            recipientName: otherParticipant.fullName || otherParticipant.email,
            documentName: participant.request.document.name,
            requestTitle: participant.request.title,
            signerName: participant.fullName || participant.email,
            completedAt: new Date(),
          })

          await sendEmail({
            to: otherParticipant.email,
            subject: `Document Fully Executed: ${participant.request.title}`,
            html: emailHtml,
          })
        }
      }

      // Trigger webhook for completed signature request
      const orgId = (await db.query.signatureRequests.findFirst({
        where: eq(signatureRequests.id, participant.requestId),
        columns: { orgId: true },
      }))?.orgId

      if (orgId) {
        await triggerOrgWebhooks(orgId, 'signature_request.completed', {
          requestId: participant.requestId,
          title: participant.request.title,
          documentName: participant.request.document.name,
          completedAt: new Date().toISOString(),
          participantCount: allParticipants.length,
        })
      }
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

        // Send email notification to next participant
        const creator = await db.query.users.findFirst({
          where: eq(users.id, participant.request.createdBy),
        })

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const signingUrl = `${baseUrl}/sign/${nextParticipant.accessToken}`

        const emailHtml = generateSignatureRequestEmail({
          recipientName: nextParticipant.fullName || nextParticipant.email,
          senderName: creator?.firstName && creator?.lastName
            ? `${creator.firstName} ${creator.lastName}`
            : creator?.email || 'Insign',
          documentName: participant.request.document.name,
          requestTitle: participant.request.title,
          message: participant.request.message || undefined,
          signingUrl,
          expiresAt: participant.request.expiresAt || undefined,
        })

        await sendEmail({
          to: nextParticipant.email,
          subject: `Signature Request: ${participant.request.title}`,
          html: emailHtml,
        })
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
