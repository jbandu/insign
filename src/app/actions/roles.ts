'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { roles, users, rolePermissions, permissions } from '@/lib/db/schema'
import { roleSchema, roleUpdateSchema, type RoleInput, type RoleUpdateInput } from '@/lib/validations/auth'
import { eq, and, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getRoles() {
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

    // Get organization-specific roles and system roles
    const rolesList = await db.query.roles.findMany({
      where: or(
        eq(roles.orgId, currentUser.orgId),
        and(isNull(roles.orgId), eq(roles.isSystem, true))
      ),
      orderBy: (roles, { asc }) => [asc(roles.name)],
    })

    return { success: true, data: rolesList }
  } catch (error) {
    console.error('Get roles error:', error)
    return { success: false, error: 'Failed to fetch roles' }
  }
}

export async function getRole(roleId: string) {
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

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
      with: {
        permissions: {
          with: {
            permission: true,
          },
        },
      },
    })

    if (!role) {
      return { success: false, error: 'Role not found' }
    }

    // Verify access (own org or system role)
    if (role.orgId && role.orgId !== currentUser.orgId) {
      return { success: false, error: 'Unauthorized' }
    }

    return { success: true, data: role }
  } catch (error) {
    console.error('Get role error:', error)
    return { success: false, error: 'Failed to fetch role' }
  }
}

export async function createRole(input: RoleInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = roleSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    const [newRole] = await db
      .insert(roles)
      .values({
        orgId: currentUser.orgId,
        name: validatedData.name,
        description: validatedData.description,
        isSystem: false,
      })
      .returning()

    revalidatePath('/dashboard/roles')

    return { success: true, data: newRole }
  } catch (error) {
    console.error('Create role error:', error)
    return { success: false, error: 'Failed to create role' }
  }
}

export async function updateRole(roleId: string, input: RoleUpdateInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = roleUpdateSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Verify role belongs to org and is not a system role
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    })

    if (!role || role.orgId !== currentUser.orgId || role.isSystem) {
      return { success: false, error: 'Cannot modify this role' }
    }

    const [updatedRole] = await db
      .update(roles)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, roleId))
      .returning()

    revalidatePath('/dashboard/roles')

    return { success: true, data: updatedRole }
  } catch (error) {
    console.error('Update role error:', error)
    return { success: false, error: 'Failed to update role' }
  }
}

export async function deleteRole(roleId: string) {
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

    // Verify role belongs to org and is not a system role
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    })

    if (!role || role.orgId !== currentUser.orgId || role.isSystem) {
      return { success: false, error: 'Cannot delete this role' }
    }

    // Check if any users have this role
    const usersWithRole = await db.query.users.findFirst({
      where: eq(users.roleId, roleId),
    })

    if (usersWithRole) {
      return {
        success: false,
        error: 'Cannot delete role that is assigned to users',
      }
    }

    await db.delete(roles).where(eq(roles.id, roleId))

    revalidatePath('/dashboard/roles')

    return { success: true }
  } catch (error) {
    console.error('Delete role error:', error)
    return { success: false, error: 'Failed to delete role' }
  }
}

export async function getPermissions() {
  try {
    const permissionsList = await db.query.permissions.findMany({
      orderBy: (permissions, { asc }) => [asc(permissions.resource), asc(permissions.action)],
    })

    return { success: true, data: permissionsList }
  } catch (error) {
    console.error('Get permissions error:', error)
    return { success: false, error: 'Failed to fetch permissions' }
  }
}
