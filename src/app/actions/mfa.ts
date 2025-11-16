'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { mfaMethods, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import crypto from 'crypto'

// Note: This implementation requires the following packages to be installed:
// npm install speakeasy qrcode
//
// For now, this is a placeholder implementation that shows the structure.
// The actual TOTP generation and verification would use these libraries.

// Validation schemas
const setupMfaSchema = z.object({
  type: z.enum(['totp', 'sms', 'email']),
})

const verifyMfaSchema = z.object({
  code: z.string().length(6),
  methodId: z.string().uuid(),
})

const verifyBackupCodeSchema = z.object({
  code: z.string().min(8),
})

/**
 * Generate a secret key for TOTP
 */
function generateTOTPSecret(): string {
  // In production, use: speakeasy.generateSecret({ length: 32 })
  // For now, generate a random base32 string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)]
  }
  return secret
}

/**
 * Generate backup codes
 */
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
  }
  return codes
}

/**
 * Verify TOTP token
 */
function verifyTOTPToken(secret: string, token: string): boolean {
  // In production, use: speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 2 })
  // For now, this is a placeholder that always returns false
  // You would need to implement actual TOTP verification
  console.warn('TOTP verification not implemented - requires speakeasy library')
  return false
}

/**
 * Get QR code data URL for TOTP setup
 */
async function generateQRCode(otpauthUrl: string): Promise<string> {
  // In production, use: QRCode.toDataURL(otpauthUrl)
  // For now, return a placeholder
  console.warn('QR code generation not implemented - requires qrcode library')
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    otpauthUrl
  )}`
}

/**
 * Get user's MFA methods
 */
export async function getMfaMethods() {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const methods = await db.query.mfaMethods.findMany({
      where: eq(mfaMethods.userId, session.user.id),
      orderBy: (methods, { desc }) => [desc(methods.createdAt)],
    })

    // Don't expose secrets or backup codes
    const safeMethods = methods.map((method) => ({
      id: method.id,
      type: method.type,
      enabled: method.enabled,
      verifiedAt: method.verifiedAt,
      createdAt: method.createdAt,
    }))

    return { success: true, data: safeMethods }
  } catch (error) {
    console.error('Get MFA methods error:', error)
    return { success: false, error: 'Failed to fetch MFA methods' }
  }
}

/**
 * Setup a new MFA method (generate secret, return QR code)
 */
export async function setupMfaMethod(input: z.infer<typeof setupMfaSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = setupMfaSchema.parse(input)

    // Check if user already has this type of MFA
    const existing = await db.query.mfaMethods.findFirst({
      where: and(
        eq(mfaMethods.userId, session.user.id),
        eq(mfaMethods.type, validatedData.type)
      ),
    })

    if (existing) {
      return { success: false, error: 'MFA method of this type already exists' }
    }

    if (validatedData.type === 'totp') {
      // Generate TOTP secret
      const secret = generateTOTPSecret()
      const backupCodes = generateBackupCodes()

      // Get user info for QR code
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      })

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Create OTP auth URL for QR code
      const otpauthUrl = `otpauth://totp/Insign:${user.email}?secret=${secret}&issuer=Insign`

      // Generate QR code
      const qrCode = await generateQRCode(otpauthUrl)

      // Create MFA method (not enabled yet - needs verification)
      const [newMethod] = await db
        .insert(mfaMethods)
        .values({
          userId: session.user.id,
          type: validatedData.type,
          secret,
          backupCodes,
          enabled: false,
        })
        .returning()

      return {
        success: true,
        data: {
          methodId: newMethod.id,
          secret,
          qrCode,
          backupCodes,
          otpauthUrl,
        },
      }
    } else {
      // For SMS/Email MFA, implementation would differ
      return {
        success: false,
        error: 'Only TOTP MFA is currently supported',
      }
    }
  } catch (error) {
    console.error('Setup MFA error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to setup MFA' }
  }
}

/**
 * Verify and enable an MFA method
 */
export async function verifyAndEnableMfa(input: z.infer<typeof verifyMfaSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = verifyMfaSchema.parse(input)

    // Get the MFA method
    const method = await db.query.mfaMethods.findFirst({
      where: and(
        eq(mfaMethods.id, validatedData.methodId),
        eq(mfaMethods.userId, session.user.id)
      ),
    })

    if (!method) {
      return { success: false, error: 'MFA method not found' }
    }

    if (method.enabled) {
      return { success: false, error: 'MFA method already enabled' }
    }

    // Verify the code
    let isValid = false
    if (method.type === 'totp') {
      isValid = verifyTOTPToken(method.secret, validatedData.code)
    }

    if (!isValid) {
      return { success: false, error: 'Invalid verification code' }
    }

    // Enable the MFA method
    await db
      .update(mfaMethods)
      .set({
        enabled: true,
        verifiedAt: new Date(),
      })
      .where(eq(mfaMethods.id, validatedData.methodId))

    // Enable MFA on user account
    await db
      .update(users)
      .set({
        mfaEnabled: true,
      })
      .where(eq(users.id, session.user.id))

    revalidatePath('/dashboard/settings')

    return { success: true }
  } catch (error) {
    console.error('Verify and enable MFA error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to verify MFA' }
  }
}

/**
 * Disable an MFA method
 */
export async function disableMfaMethod(methodId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Get the MFA method
    const method = await db.query.mfaMethods.findFirst({
      where: and(eq(mfaMethods.id, methodId), eq(mfaMethods.userId, session.user.id)),
    })

    if (!method) {
      return { success: false, error: 'MFA method not found' }
    }

    // Delete the MFA method
    await db.delete(mfaMethods).where(eq(mfaMethods.id, methodId))

    // Check if user has any other enabled MFA methods
    const otherMethods = await db.query.mfaMethods.findMany({
      where: and(
        eq(mfaMethods.userId, session.user.id),
        eq(mfaMethods.enabled, true)
      ),
    })

    // If no other methods, disable MFA on user
    if (otherMethods.length === 0) {
      await db
        .update(users)
        .set({
          mfaEnabled: false,
        })
        .where(eq(users.id, session.user.id))
    }

    revalidatePath('/dashboard/settings')

    return { success: true }
  } catch (error) {
    console.error('Disable MFA error:', error)
    return { success: false, error: 'Failed to disable MFA' }
  }
}

/**
 * Verify MFA code during login
 */
export async function verifyMfaLogin(userId: string, code: string) {
  try {
    // Get user's enabled TOTP method
    const method = await db.query.mfaMethods.findFirst({
      where: and(
        eq(mfaMethods.userId, userId),
        eq(mfaMethods.type, 'totp'),
        eq(mfaMethods.enabled, true)
      ),
    })

    if (!method) {
      return { success: false, error: 'No MFA method found' }
    }

    // Verify the code
    const isValid = verifyTOTPToken(method.secret, code)

    if (!isValid) {
      // Check if it's a backup code
      if (method.backupCodes && method.backupCodes.includes(code.toUpperCase())) {
        // Remove used backup code
        const updatedCodes = method.backupCodes.filter((c) => c !== code.toUpperCase())
        await db
          .update(mfaMethods)
          .set({ backupCodes: updatedCodes })
          .where(eq(mfaMethods.id, method.id))

        return { success: true, usedBackupCode: true }
      }

      return { success: false, error: 'Invalid code' }
    }

    return { success: true, usedBackupCode: false }
  } catch (error) {
    console.error('Verify MFA login error:', error)
    return { success: false, error: 'Failed to verify MFA' }
  }
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(methodId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Get the MFA method
    const method = await db.query.mfaMethods.findFirst({
      where: and(eq(mfaMethods.id, methodId), eq(mfaMethods.userId, session.user.id)),
    })

    if (!method) {
      return { success: false, error: 'MFA method not found' }
    }

    // Generate new backup codes
    const newBackupCodes = generateBackupCodes()

    // Update the method
    await db
      .update(mfaMethods)
      .set({ backupCodes: newBackupCodes })
      .where(eq(mfaMethods.id, methodId))

    return { success: true, data: { backupCodes: newBackupCodes } }
  } catch (error) {
    console.error('Regenerate backup codes error:', error)
    return { success: false, error: 'Failed to regenerate backup codes' }
  }
}

/**
 * Get backup codes for a method
 */
export async function getBackupCodes(methodId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const method = await db.query.mfaMethods.findFirst({
      where: and(eq(mfaMethods.id, methodId), eq(mfaMethods.userId, session.user.id)),
    })

    if (!method) {
      return { success: false, error: 'MFA method not found' }
    }

    return { success: true, data: { backupCodes: method.backupCodes || [] } }
  } catch (error) {
    console.error('Get backup codes error:', error)
    return { success: false, error: 'Failed to get backup codes' }
  }
}
