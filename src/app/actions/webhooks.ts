'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { webhooks, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { sendWebhook, type WebhookPayload } from '@/lib/webhooks'
import { z } from 'zod'

const webhookSchema = z.object({
  url: z.string().url('Invalid URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

type WebhookInput = z.infer<typeof webhookSchema>

export async function getWebhooks() {
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

    const orgWebhooks = await db.query.webhooks.findMany({
      where: eq(webhooks.orgId, currentUser.orgId),
    })

    return { success: true, data: orgWebhooks }
  } catch (error) {
    console.error('Get webhooks error:', error)
    return { success: false, error: 'Failed to fetch webhooks' }
  }
}

export async function createWebhook(input: WebhookInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const validatedData = webhookSchema.parse(input)

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })

    if (!currentUser) {
      return { success: false, error: 'User not found' }
    }

    const secret = `whsec_${nanoid(32)}`

    const [webhook] = await db
      .insert(webhooks)
      .values({
        orgId: currentUser.orgId,
        url: validatedData.url,
        events: validatedData.events,
        description: validatedData.description,
        secret,
        isActive: validatedData.isActive,
      })
      .returning()

    revalidatePath('/dashboard/settings/webhooks')

    return { success: true, data: webhook }
  } catch (error) {
    console.error('Create webhook error:', error)
    return { success: false, error: 'Failed to create webhook' }
  }
}

export async function updateWebhook(webhookId: string, input: Partial<WebhookInput>) {
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

    // Verify webhook belongs to org
    const webhook = await db.query.webhooks.findFirst({
      where: and(
        eq(webhooks.id, webhookId),
        eq(webhooks.orgId, currentUser.orgId)
      ),
    })

    if (!webhook) {
      return { success: false, error: 'Webhook not found' }
    }

    const [updated] = await db
      .update(webhooks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, webhookId))
      .returning()

    revalidatePath('/dashboard/settings/webhooks')

    return { success: true, data: updated }
  } catch (error) {
    console.error('Update webhook error:', error)
    return { success: false, error: 'Failed to update webhook' }
  }
}

export async function deleteWebhook(webhookId: string) {
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

    // Verify webhook belongs to org
    const webhook = await db.query.webhooks.findFirst({
      where: and(
        eq(webhooks.id, webhookId),
        eq(webhooks.orgId, currentUser.orgId)
      ),
    })

    if (!webhook) {
      return { success: false, error: 'Webhook not found' }
    }

    await db.delete(webhooks).where(eq(webhooks.id, webhookId))

    revalidatePath('/dashboard/settings/webhooks')

    return { success: true }
  } catch (error) {
    console.error('Delete webhook error:', error)
    return { success: false, error: 'Failed to delete webhook' }
  }
}

export async function testWebhook(webhookId: string) {
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

    // Verify webhook belongs to org
    const webhook = await db.query.webhooks.findFirst({
      where: and(
        eq(webhooks.id, webhookId),
        eq(webhooks.orgId, currentUser.orgId)
      ),
    })

    if (!webhook) {
      return { success: false, error: 'Webhook not found' }
    }

    const testPayload: WebhookPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Insign',
        webhook_id: webhookId,
      },
    }

    const result = await sendWebhook(webhook.url, testPayload, webhook.secret)

    if (result.success) {
      // Update last triggered time
      await db
        .update(webhooks)
        .set({ lastTriggeredAt: new Date() })
        .where(eq(webhooks.id, webhookId))

      revalidatePath('/dashboard/settings/webhooks')
    }

    return result
  } catch (error) {
    console.error('Test webhook error:', error)
    return { success: false, error: 'Failed to test webhook' }
  }
}

// Helper function to trigger webhooks for an organization
export async function triggerOrgWebhooks(
  orgId: string,
  event: string,
  data: any
) {
  try {
    const orgWebhooks = await db.query.webhooks.findMany({
      where: and(
        eq(webhooks.orgId, orgId),
        eq(webhooks.isActive, true)
      ),
    })

    const matchingWebhooks = orgWebhooks.filter(w =>
      w.events.includes(event) || w.events.includes('*')
    )

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    }

    // Send webhooks in parallel
    const results = await Promise.allSettled(
      matchingWebhooks.map(webhook =>
        sendWebhook(webhook.url, payload, webhook.secret)
      )
    )

    // Update last triggered time for webhooks
    for (const webhook of matchingWebhooks) {
      await db
        .update(webhooks)
        .set({ lastTriggeredAt: new Date() })
        .where(eq(webhooks.id, webhook.id))
    }

    return { success: true, triggered: matchingWebhooks.length }
  } catch (error) {
    console.error('Trigger org webhooks error:', error)
    return { success: false, error: 'Failed to trigger webhooks' }
  }
}
