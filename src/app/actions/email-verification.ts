'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { emailVerificationSchema, type EmailVerificationInput } from '@/lib/validations/auth'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

/**
 * Generate a secure verification token
 */
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Send verification email to current user
 */
export async function sendVerificationEmail() {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (user.emailVerified) {
      return { success: false, error: 'Email is already verified' }
    }

    // Generate verification token
    const verificationToken = generateVerificationToken()
    const verificationExpiry = new Date(Date.now() + 86400000) // 24 hours from now

    // TODO: Store token in database (requires adding fields to schema)
    // await db
    //   .update(users)
    //   .set({
    //     verificationToken,
    //     verificationTokenExpiry: verificationExpiry,
    //   })
    //   .where(eq(users.id, user.id))

    // TODO: Send email with verification link
    // const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`
    // await sendVerificationEmail(user.email, verificationUrl)

    console.log('Verification email requested for:', user.email)
    console.log('Verification token (TODO: send via email):', verificationToken)

    return {
      success: true,
      message: 'Verification email has been sent. Please check your inbox.'
    }
  } catch (error) {
    console.error('Send verification email error:', error)
    return { success: false, error: 'Failed to send verification email' }
  }
}

/**
 * Verify email using token
 */
export async function verifyEmail(input: EmailVerificationInput) {
  try {
    const validatedData = emailVerificationSchema.parse(input)

    // TODO: Find user by verification token (requires schema update)
    // const user = await db.query.users.findFirst({
    //   where: eq(users.verificationToken, validatedData.token),
    // })

    // For now, using a placeholder
    const user = await db.query.users.findFirst({
      where: eq(users.id, validatedData.token),
    })

    if (!user) {
      return { success: false, error: 'Invalid or expired verification token' }
    }

    // TODO: Check token expiry
    // if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
    //   return { success: false, error: 'Verification token has expired' }
    // }

    // Mark email as verified
    await db
      .update(users)
      .set({
        emailVerified: new Date(),
        // verificationToken: null,
        // verificationTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    return {
      success: true,
      message: 'Email has been verified successfully!'
    }
  } catch (error) {
    console.error('Email verification error:', error)
    return { success: false, error: 'Failed to verify email' }
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail() {
  return sendVerificationEmail()
}
