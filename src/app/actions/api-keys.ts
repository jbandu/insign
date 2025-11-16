'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { apiKeys, users } from '@/lib/db/schema'
import { eq, and, isNull, gt, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schemas
const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  expiresAt: z.string().optional(),
})

// Available scopes for API keys
export const AVAILABLE_SCOPES = [
  { value: 'documents:read', label: 'Read Documents', description: 'View and download documents' },
  { value: 'documents:write', label: 'Write Documents', description: 'Upload and update documents' },
  { value: 'documents:delete', label: 'Delete Documents', description: 'Delete documents' },
  { value: 'signatures:read', label: 'Read Signatures', description: 'View signature requests' },
  { value: 'signatures:write', label: 'Write Signatures', description: 'Create signature requests' },
  { value: 'users:read', label: 'Read Users', description: 'View user information' },
  { value: 'webhooks:read', label: 'Read Webhooks', description: 'View webhooks' },
  { value: 'webhooks:write', label: 'Write Webhooks', description: 'Create and manage webhooks' },
] as const

/**
 * Generate a secure API key
 */
function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate a random 32-byte key
  const keyBytes = crypto.randomBytes(32)
  const key = `isk_${keyBytes.toString('base64url')}` // isk = insign key

  // Create hash for storage
  const hash = crypto.createHash('sha256').update(key).digest('hex')

  // Get prefix for display (first 12 chars after isk_)
  const prefix = key.substring(0, 12)

  return { key, hash, prefix }
}

/**
 * Hash an API key for verification
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Get all API keys for the current user
 */
export async function getApiKeys() {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, session.user.id),
      orderBy: (keys, { desc }) => [desc(keys.createdAt)],
    })

    // Don't expose key hashes
    const safeKeys = keys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      lastUsedIp: key.lastUsedIp,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
    }))

    return { success: true, data: safeKeys }
  } catch (error) {
    console.error('Get API keys error:', error)
    return { success: false, error: 'Failed to fetch API keys' }
  }
}

/**
 * Create a new API key
 */
export async function createApiKey(input: z.infer<typeof createApiKeySchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = createApiKeySchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Generate API key
    const { key, hash, prefix } = generateApiKey()

    // Create API key record
    const [newApiKey] = await db
      .insert(apiKeys)
      .values({
        userId: currentUser.id,
        orgId: currentUser.orgId,
        name: validatedData.name,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: validatedData.scopes,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      })
      .returning()

    revalidatePath('/dashboard/settings/api-keys')

    // Return the actual key ONLY this once - it won't be shown again
    return {
      success: true,
      data: {
        ...newApiKey,
        key, // Only returned during creation
      },
    }
  } catch (error) {
    console.error('Create API key error:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to create API key' }
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Verify key belongs to user
    const key = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, keyId), eq(apiKeys.userId, session.user.id)),
    })

    if (!key) {
      return { success: false, error: 'API key not found' }
    }

    // Mark as revoked
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.id, keyId))

    revalidatePath('/dashboard/settings/api-keys')

    return { success: true }
  } catch (error) {
    console.error('Revoke API key error:', error)
    return { success: false, error: 'Failed to revoke API key' }
  }
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(keyId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Verify key belongs to user
    const key = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, keyId), eq(apiKeys.userId, session.user.id)),
    })

    if (!key) {
      return { success: false, error: 'API key not found' }
    }

    // Delete key
    await db.delete(apiKeys).where(eq(apiKeys.id, keyId))

    revalidatePath('/dashboard/settings/api-keys')

    return { success: true }
  } catch (error) {
    console.error('Delete API key error:', error)
    return { success: false, error: 'Failed to delete API key' }
  }
}

/**
 * Verify an API key and return user/org info if valid
 * This is used by API routes to authenticate requests
 */
export async function verifyApiKey(key: string) {
  try {
    if (!key || !key.startsWith('isk_')) {
      return { valid: false, error: 'Invalid API key format' }
    }

    const hash = hashApiKey(key)

    const apiKey = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.keyHash, hash),
      with: {
        user: {
          with: {
            organization: true,
          },
        },
      },
    })

    if (!apiKey) {
      return { valid: false, error: 'API key not found' }
    }

    // Check if revoked
    if (apiKey.revokedAt) {
      return { valid: false, error: 'API key has been revoked' }
    }

    // Check if expired
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false, error: 'API key has expired' }
    }

    // Update last used
    await db
      .update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        // Note: lastUsedIp would need to be passed from the API route
      })
      .where(eq(apiKeys.id, apiKey.id))

    return {
      valid: true,
      userId: apiKey.userId,
      orgId: apiKey.orgId,
      scopes: apiKey.scopes,
      user: apiKey.user,
    }
  } catch (error) {
    console.error('Verify API key error:', error)
    return { valid: false, error: 'Failed to verify API key' }
  }
}

/**
 * Check if an API key has a specific scope
 */
export function hasScope(scopes: string[], requiredScope: string): boolean {
  // Check for exact match
  if (scopes.includes(requiredScope)) {
    return true
  }

  // Check for wildcard scope (e.g., 'documents:*' includes 'documents:read')
  const [resource] = requiredScope.split(':')
  if (scopes.includes(`${resource}:*`)) {
    return true
  }

  // Check for admin scope
  if (scopes.includes('admin:*') || scopes.includes('*')) {
    return true
  }

  return false
}

/**
 * Update last used timestamp and IP for an API key
 * This is called from API routes
 */
export async function updateApiKeyUsage(keyId: string, ipAddress?: string) {
  try {
    await db
      .update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        lastUsedIp: ipAddress || null,
      })
      .where(eq(apiKeys.id, keyId))

    return { success: true }
  } catch (error) {
    console.error('Update API key usage error:', error)
    return { success: false, error: 'Failed to update API key usage' }
  }
}
