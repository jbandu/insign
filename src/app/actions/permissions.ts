'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documentPermissions, users, documents, roles } from '@/lib/db/schema'
import { eq, and, or, gt, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation schemas
const grantPermissionSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  permissionLevel: z.enum(['read', 'write', 'delete', 'admin']),
  expiresAt: z.string().optional(),
}).refine(
  (data) => data.userId || data.roleId,
  { message: 'Either userId or roleId must be provided' }
)

const updatePermissionSchema = z.object({
  permissionLevel: z.enum(['read', 'write', 'delete', 'admin']).optional(),
  expiresAt: z.string().nullable().optional(),
})

type PermissionLevel = 'read' | 'write' | 'delete' | 'admin'

const permissionHierarchy: Record<PermissionLevel, number> = {
  read: 1,
  write: 2,
  delete: 3,
  admin: 4,
}

/**
 * Check if user has specific permission level for a document
 */
export async function checkDocumentPermission(
  documentId: string,
  requiredLevel: PermissionLevel
): Promise<{ hasPermission: boolean; message?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { hasPermission: false, message: 'Unauthorized' }
  }

  try {
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        role: true,
      },
    })

    if (!currentUser) {
      return { hasPermission: false, message: 'User not found' }
    }

    // Check if document exists and belongs to org
    const document = await db.query.documents.findFirst({
      where: and(
        eq(documents.id, documentId),
        eq(documents.orgId, currentUser.orgId)
      ),
    })

    if (!document) {
      return { hasPermission: false, message: 'Document not found' }
    }

    // Document creator always has admin permission
    if (document.createdBy === currentUser.id) {
      return { hasPermission: true }
    }

    // Check explicit user permissions
    const userPermissions = await db.query.documentPermissions.findMany({
      where: and(
        eq(documentPermissions.documentId, documentId),
        eq(documentPermissions.userId, currentUser.id),
        or(
          isNull(documentPermissions.expiresAt),
          gt(documentPermissions.expiresAt, new Date())
        )
      ),
    })

    // Check role-based permissions
    const rolePermissions = currentUser.roleId
      ? await db.query.documentPermissions.findMany({
          where: and(
            eq(documentPermissions.documentId, documentId),
            eq(documentPermissions.roleId, currentUser.roleId),
            or(
              isNull(documentPermissions.expiresAt),
              gt(documentPermissions.expiresAt, new Date())
            )
          ),
        })
      : []

    const allPermissions = [...userPermissions, ...rolePermissions]

    if (allPermissions.length === 0) {
      return { hasPermission: false, message: 'No permissions granted' }
    }

    // Find highest permission level
    const highestPermission = allPermissions.reduce((highest, perm) => {
      const current = permissionHierarchy[perm.permissionLevel as PermissionLevel] || 0
      const max = permissionHierarchy[highest as PermissionLevel] || 0
      return current > max ? perm.permissionLevel : highest
    }, 'read')

    const hasPermission =
      permissionHierarchy[highestPermission as PermissionLevel] >=
      permissionHierarchy[requiredLevel]

    return {
      hasPermission,
      message: hasPermission ? undefined : `Requires ${requiredLevel} permission`,
    }
  } catch (error) {
    console.error('Check permission error:', error)
    return { hasPermission: false, message: 'Failed to check permissions' }
  }
}

/**
 * Get all permissions for a document
 */
export async function getDocumentPermissions(documentId: string) {
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

    // Verify document belongs to org
    const document = await db.query.documents.findFirst({
      where: and(
        eq(documents.id, documentId),
        eq(documents.orgId, currentUser.orgId)
      ),
    })

    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    // Check if user has admin permission
    const permissionCheck = await checkDocumentPermission(documentId, 'admin')
    if (!permissionCheck.hasPermission) {
      return { success: false, error: 'Only administrators can view permissions' }
    }

    const permissions = await db.query.documentPermissions.findMany({
      where: eq(documentPermissions.documentId, documentId),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
          columns: {
            id: true,
            name: true,
          },
        },
        grantedByUser: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: (permissions, { desc }) => [desc(permissions.grantedAt)],
    })

    return { success: true, data: permissions }
  } catch (error) {
    console.error('Get document permissions error:', error)
    return { success: false, error: 'Failed to fetch permissions' }
  }
}

/**
 * Grant permission to a user or role for a document
 */
export async function grantDocumentPermission(
  input: z.infer<typeof grantPermissionSchema>
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = grantPermissionSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Check if user has admin permission for this document
    const permissionCheck = await checkDocumentPermission(
      validatedData.documentId,
      'admin'
    )
    if (!permissionCheck.hasPermission) {
      return { success: false, error: 'Only administrators can grant permissions' }
    }

    // Verify target user/role exists and belongs to same org
    if (validatedData.userId) {
      const targetUser = await db.query.users.findFirst({
        where: and(
          eq(users.id, validatedData.userId),
          eq(users.orgId, currentUser.orgId)
        ),
      })
      if (!targetUser) {
        return { success: false, error: 'Target user not found or not in same organization' }
      }

      // Check if permission already exists for this user
      const existing = await db.query.documentPermissions.findFirst({
        where: and(
          eq(documentPermissions.documentId, validatedData.documentId),
          eq(documentPermissions.userId, validatedData.userId)
        ),
      })

      if (existing) {
        return { success: false, error: 'Permission already exists for this user' }
      }
    }

    if (validatedData.roleId) {
      const targetRole = await db.query.roles.findFirst({
        where: and(
          eq(roles.id, validatedData.roleId),
          eq(roles.orgId, currentUser.orgId)
        ),
      })
      if (!targetRole) {
        return { success: false, error: 'Target role not found or not in same organization' }
      }

      // Check if permission already exists for this role
      const existing = await db.query.documentPermissions.findFirst({
        where: and(
          eq(documentPermissions.documentId, validatedData.documentId),
          eq(documentPermissions.roleId, validatedData.roleId)
        ),
      })

      if (existing) {
        return { success: false, error: 'Permission already exists for this role' }
      }
    }

    const [newPermission] = await db
      .insert(documentPermissions)
      .values({
        documentId: validatedData.documentId,
        userId: validatedData.userId || null,
        roleId: validatedData.roleId || null,
        permissionLevel: validatedData.permissionLevel,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        grantedBy: currentUser.id,
      })
      .returning()

    revalidatePath('/dashboard/documents')

    return { success: true, data: newPermission }
  } catch (error) {
    console.error('Grant permission error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to grant permission' }
  }
}

/**
 * Update an existing permission
 */
export async function updateDocumentPermission(
  permissionId: string,
  input: z.infer<typeof updatePermissionSchema>
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = updatePermissionSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Get the permission to update
    const permission = await db.query.documentPermissions.findFirst({
      where: eq(documentPermissions.id, permissionId),
    })

    if (!permission) {
      return { success: false, error: 'Permission not found' }
    }

    // Check if user has admin permission for this document
    const permissionCheck = await checkDocumentPermission(permission.documentId, 'admin')
    if (!permissionCheck.hasPermission) {
      return { success: false, error: 'Only administrators can update permissions' }
    }

    const updateData: any = {}
    if (validatedData.permissionLevel) {
      updateData.permissionLevel = validatedData.permissionLevel
    }
    if (validatedData.expiresAt !== undefined) {
      updateData.expiresAt = validatedData.expiresAt ? new Date(validatedData.expiresAt) : null
    }

    const [updatedPermission] = await db
      .update(documentPermissions)
      .set(updateData)
      .where(eq(documentPermissions.id, permissionId))
      .returning()

    revalidatePath('/dashboard/documents')

    return { success: true, data: updatedPermission }
  } catch (error) {
    console.error('Update permission error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to update permission' }
  }
}

/**
 * Revoke a permission
 */
export async function revokeDocumentPermission(permissionId: string) {
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

    // Get the permission to revoke
    const permission = await db.query.documentPermissions.findFirst({
      where: eq(documentPermissions.id, permissionId),
    })

    if (!permission) {
      return { success: false, error: 'Permission not found' }
    }

    // Check if user has admin permission for this document
    const permissionCheck = await checkDocumentPermission(permission.documentId, 'admin')
    if (!permissionCheck.hasPermission) {
      return { success: false, error: 'Only administrators can revoke permissions' }
    }

    await db.delete(documentPermissions).where(eq(documentPermissions.id, permissionId))

    revalidatePath('/dashboard/documents')

    return { success: true }
  } catch (error) {
    console.error('Revoke permission error:', error)
    return { success: false, error: 'Failed to revoke permission' }
  }
}
