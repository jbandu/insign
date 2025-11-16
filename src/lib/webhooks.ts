import crypto from 'crypto'

export interface WebhookPayload {
  event: string
  timestamp: string
  data: any
}

export async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate signature for webhook verification
    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Insign-Signature': signature,
        'X-Insign-Event': payload.event,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook returned ${response.status}: ${response.statusText}`,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Webhook send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send webhook',
    }
  }
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
