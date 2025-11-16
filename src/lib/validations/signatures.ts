import { z } from 'zod'

// Signature request validation
export const signatureRequestSchema = z.object({
  documentId: z.string().uuid('Invalid document'),
  title: z.string().min(1, 'Title is required').max(255),
  message: z.string().optional(),
  workflowType: z.enum(['sequential', 'parallel']).default('sequential'),
  expiresAt: z.date().optional(),
  participants: z.array(
    z.object({
      email: z.string().email('Invalid email'),
      fullName: z.string().min(1, 'Full name is required'),
      role: z.enum(['signer', 'approver', 'cc']).default('signer'),
      orderIndex: z.number().int().min(0).default(0),
    })
  ).min(1, 'At least one participant is required'),
})

export const signatureRequestUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  message: z.string().optional(),
  status: z.enum(['draft', 'sent', 'in_progress', 'completed', 'declined', 'expired', 'cancelled']).optional(),
})

// Signature field validation
export const signatureFieldSchema = z.object({
  requestId: z.string().uuid(),
  participantId: z.string().uuid(),
  type: z.enum(['signature', 'initials', 'date', 'text', 'checkbox', 'dropdown']),
  pageNumber: z.number().int().min(1),
  x: z.number().min(0).max(100), // Percentage
  y: z.number().min(0).max(100), // Percentage
  width: z.number().min(1).max(50), // Percentage
  height: z.number().min(1).max(20), // Percentage
  required: z.boolean().default(true),
  label: z.string().optional(),
  options: z.any().optional(),
})

// Signature capture validation
export const signatureCaptureSchema = z.object({
  participantId: z.string().uuid(),
  fieldId: z.string().uuid(),
  signatureData: z.string().min(1, 'Signature data is required'),
  signatureType: z.enum(['drawn', 'typed', 'uploaded']),
  accessToken: z.string().min(1),
})

// Participant action validation
export const participantActionSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  action: z.enum(['view', 'sign', 'decline']),
  declineReason: z.string().optional(),
})

// Types
export type SignatureRequestInput = z.infer<typeof signatureRequestSchema>
export type SignatureRequestUpdateInput = z.infer<typeof signatureRequestUpdateSchema>
export type SignatureFieldInput = z.infer<typeof signatureFieldSchema>
export type SignatureCaptureInput = z.infer<typeof signatureCaptureSchema>
export type ParticipantActionInput = z.infer<typeof participantActionSchema>
