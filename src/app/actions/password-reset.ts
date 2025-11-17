'use server'

import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import {
  passwordResetRequestSchema,
  passwordResetSchema,
  type PasswordResetRequestInput,
  type PasswordResetInput
} from '@/lib/validations/auth'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

/**
 * Generate a secure random token
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Request password reset - sends email with reset link
 */
export async function requestPasswordReset(input: PasswordResetRequestInput) {
  try {
    const validatedData = passwordResetRequestSchema.parse(input)

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    })

    // Don't reveal if email exists or not for security
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      }
    }

    // Generate reset token
    const resetToken = generateResetToken()
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Store token in user record (you may want to create a separate password_reset_tokens table)
    await db
      .update(users)
      .set({
        // Note: You'll need to add these fields to the users schema
        // resetToken,
        // resetTokenExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`
    // await sendPasswordResetEmail(user.email, resetUrl)

    console.log('Password reset requested for:', user.email)
    console.log('Reset token (TODO: send via email):', resetToken)

    return {
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.'
    }
  } catch (error) {
    console.error('Password reset request error:', error)
    return {
      success: true, // Still return success to not reveal user existence
      message: 'If an account exists with this email, you will receive password reset instructions.'
    }
  }
}

/**
 * Reset password using token
 */
export async function resetPassword(input: PasswordResetInput) {
  try {
    const validatedData = passwordResetSchema.parse(input)

    // Find user by reset token
    // Note: This requires resetToken and resetTokenExpiry fields in users schema
    const user = await db.query.users.findFirst({
      where: eq(users.id, validatedData.token), // TODO: Update to use resetToken field
    })

    if (!user) {
      return { success: false, error: 'Invalid or expired reset token' }
    }

    // TODO: Verify token expiry
    // if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
    //   return { success: false, error: 'Reset token has expired' }
    // }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Update password and clear reset token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        // resetToken: null,
        // resetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    return {
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    }
  } catch (error) {
    console.error('Password reset error:', error)
    return { success: false, error: 'Failed to reset password. Please try again.' }
  }
}
