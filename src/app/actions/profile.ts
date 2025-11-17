'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import {
  profileUpdateSchema,
  passwordChangeSchema,
  type ProfileUpdateInput,
  type PasswordChangeInput
} from '@/lib/validations/auth'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

/**
 * Get current user's profile
 */
export async function getCurrentProfile() {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        role: true,
        organization: true,
      },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Don't return password
    const { password, ...userWithoutPassword } = user

    return { success: true, data: userWithoutPassword }
  } catch (error) {
    console.error('Get profile error:', error)
    return { success: false, error: 'Failed to fetch profile' }
  }
}

/**
 * Update current user's profile
 */
export async function updateProfile(input: ProfileUpdateInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = profileUpdateSchema.parse(input)

    const [updatedUser] = await db
      .update(users)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning()

    revalidatePath('/dashboard/settings')

    return {
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    }
  } catch (error) {
    console.error('Update profile error:', error)
    return { success: false, error: 'Failed to update profile' }
  }
}

/**
 * Change current user's password
 */
export async function changePassword(input: PasswordChangeInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = passwordChangeSchema.parse(input)

    // Get current user
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!user || !user.password) {
      return { success: false, error: 'User not found' }
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      validatedData.currentPassword,
      user.password
    )

    if (!isValidPassword) {
      return { success: false, error: 'Current password is incorrect' }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 12)

    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))

    revalidatePath('/dashboard/settings')

    return {
      success: true,
      message: 'Password changed successfully'
    }
  } catch (error) {
    console.error('Change password error:', error)
    return { success: false, error: 'Failed to change password' }
  }
}

/**
 * Update user's avatar URL
 */
export async function updateAvatar(avatarUrl: string | null) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Validate URL if provided
    if (avatarUrl && !avatarUrl.startsWith('http')) {
      return { success: false, error: 'Invalid avatar URL' }
    }

    await db
      .update(users)
      .set({
        avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))

    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: 'Avatar updated successfully'
    }
  } catch (error) {
    console.error('Update avatar error:', error)
    return { success: false, error: 'Failed to update avatar' }
  }
}
