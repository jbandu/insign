'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { userCreateSchema, userUpdateSchema, type UserCreateInput, type UserUpdateInput } from '@/lib/validations/auth'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getUsers() {
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

    const orgUsers = await db.query.users.findMany({
      where: eq(users.orgId, currentUser.orgId),
      with: {
        role: true,
      },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    })

    return { success: true, data: orgUsers }
  } catch (error) {
    console.error('Get users error:', error)
    return { success: false, error: 'Failed to fetch users' }
  }
}

export async function createUser(input: UserCreateInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to perform this action' }
  }

  try {
    const validatedData = userCreateSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'Your user account could not be found' }
    }

    // Normalize email
    const normalizedEmail = validatedData.email.toLowerCase().trim()

    // Check if email already exists in this organization
    const existingUser = await db.query.users.findFirst({
      where: (users, { and, eq }) =>
        and(
          eq(users.orgId, currentUser.orgId),
          eq(users.email, normalizedEmail)
        ),
    })

    if (existingUser) {
      return {
        success: false,
        error: 'A user with this email address already exists in your organization'
      }
    }

    // Hash password with higher cost factor
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    const [newUser] = await db
      .insert(users)
      .values({
        orgId: currentUser.orgId,
        email: normalizedEmail,
        password: hashedPassword,
        firstName: validatedData.firstName.trim(),
        lastName: validatedData.lastName.trim(),
        roleId: validatedData.roleId,
        status: 'active',
      })
      .returning()

    revalidatePath('/dashboard/users')

    return {
      success: true,
      data: newUser,
      message: 'User created successfully'
    }
  } catch (error) {
    console.error('Create user error:', error)

    if (error instanceof Error && error.message.includes('unique constraint')) {
      return { success: false, error: 'This email address is already in use' }
    }

    return { success: false, error: 'Unable to create user. Please try again.' }
  }
}

export async function updateUser(userId: string, input: UserUpdateInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = userUpdateSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Verify the user being updated belongs to the same organization
    const userToUpdate = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!userToUpdate || userToUpdate.orgId !== currentUser.orgId) {
      return { success: false, error: 'User not found or unauthorized' }
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning()

    revalidatePath('/dashboard/users')

    return { success: true, data: updatedUser }
  } catch (error) {
    console.error('Update user error:', error)
    return { success: false, error: 'Failed to update user' }
  }
}

export async function deleteUser(userId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to perform this action' }
  }

  try {
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'Your user account could not be found' }
    }

    // Can't delete yourself
    if (userId === session.user.id) {
      return {
        success: false,
        error: 'You cannot delete your own account. Please contact another administrator.'
      }
    }

    // Verify the user being deleted belongs to the same organization
    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        role: true,
      },
    })

    if (!userToDelete) {
      return { success: false, error: 'The user you are trying to delete does not exist' }
    }

    if (userToDelete.orgId !== currentUser.orgId) {
      return {
        success: false,
        error: 'You do not have permission to delete users from other organizations'
      }
    }

    await db.delete(users).where(eq(users.id, userId))

    revalidatePath('/dashboard/users')

    return {
      success: true,
      message: 'User deleted successfully'
    }
  } catch (error) {
    console.error('Delete user error:', error)
    return {
      success: false,
      error: 'Unable to delete user. This user may have associated data that must be removed first.'
    }
  }
}
