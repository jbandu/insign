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
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = userCreateSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Check if email already exists in this organization
    const existingUser = await db.query.users.findFirst({
      where: (users, { and, eq }) =>
        and(
          eq(users.orgId, currentUser.orgId),
          eq(users.email, validatedData.email)
        ),
    })

    if (existingUser) {
      return { success: false, error: 'Email already exists in your organization' }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    const [newUser] = await db
      .insert(users)
      .values({
        orgId: currentUser.orgId,
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        roleId: validatedData.roleId,
        status: 'active',
      })
      .returning()

    revalidatePath('/dashboard/users')

    return { success: true, data: newUser }
  } catch (error) {
    console.error('Create user error:', error)
    return { success: false, error: 'Failed to create user' }
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
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Can't delete yourself
    if (userId === session.user.id) {
      return { success: false, error: 'Cannot delete your own account' }
    }

    // Verify the user being deleted belongs to the same organization
    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!userToDelete || userToDelete.orgId !== currentUser.orgId) {
      return { success: false, error: 'User not found or unauthorized' }
    }

    await db.delete(users).where(eq(users.id, userId))

    revalidatePath('/dashboard/users')

    return { success: true }
  } catch (error) {
    console.error('Delete user error:', error)
    return { success: false, error: 'Failed to delete user' }
  }
}
