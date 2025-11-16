import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail(options: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from || process.env.EMAIL_FROM || 'Insign <noreply@insign.app>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

export interface SignatureRequestEmailData {
  recipientName: string
  senderName: string
  documentName: string
  requestTitle: string
  message?: string
  signingUrl: string
  expiresAt?: Date
}

export function generateSignatureRequestEmail(data: SignatureRequestEmailData): string {
  const expiryText = data.expiresAt
    ? `<p style="color: #dc2626; font-size: 14px; margin: 16px 0;">
         ⏰ This request expires on ${new Date(data.expiresAt).toLocaleDateString()} at ${new Date(data.expiresAt).toLocaleTimeString()}
       </p>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signature Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0;">
        📝 Insign
      </h1>
      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">
        Digital Signature Platform
      </p>
    </div>

    <!-- Main Card -->
    <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 32px;">
      <!-- Greeting -->
      <p style="color: #111827; font-size: 16px; margin: 0 0 16px 0;">
        Hi ${data.recipientName},
      </p>

      <!-- Message -->
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        <strong>${data.senderName}</strong> has requested your signature on a document.
      </p>

      <!-- Document Info -->
      <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">
          DOCUMENT
        </p>
        <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">
          ${data.requestTitle}
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          ${data.documentName}
        </p>
      </div>

      ${data.message ? `
        <div style="border-left: 4px solid #3b82f6; padding-left: 16px; margin-bottom: 24px;">
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">
            "${data.message}"
          </p>
        </div>
      ` : ''}

      ${expiryText}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.signingUrl}"
           style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Review & Sign Document
        </a>
      </div>

      <!-- Alternative Link -->
      <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
        Or copy and paste this link into your browser:<br>
        <a href="${data.signingUrl}" style="color: #3b82f6; word-break: break-all;">
          ${data.signingUrl}
        </a>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        This is an automated message from Insign. Please do not reply to this email.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
        © ${new Date().getFullYear()} Insign. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

export interface SignatureCompletedEmailData {
  recipientName: string
  documentName: string
  requestTitle: string
  signerName: string
  completedAt: Date
}

export function generateSignatureCompletedEmail(data: SignatureCompletedEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signature Completed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0;">
        📝 Insign
      </h1>
      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">
        Digital Signature Platform
      </p>
    </div>

    <!-- Main Card -->
    <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 32px;">
      <!-- Success Icon -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #10b981; border-radius: 50%; width: 64px; height: 64px; line-height: 64px;">
          <span style="color: #ffffff; font-size: 32px;">✓</span>
        </div>
      </div>

      <!-- Greeting -->
      <p style="color: #111827; font-size: 16px; margin: 0 0 16px 0; text-align: center;">
        Hi ${data.recipientName},
      </p>

      <!-- Message -->
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
        <strong>${data.signerName}</strong> has signed the document.
      </p>

      <!-- Document Info -->
      <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #166534; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">
          COMPLETED DOCUMENT
        </p>
        <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">
          ${data.requestTitle}
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          ${data.documentName}
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0 0;">
          Completed: ${new Date(data.completedAt).toLocaleString()}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        This is an automated message from Insign. Please do not reply to this email.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
        © ${new Date().getFullYear()} Insign. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

export interface AllSignaturesCompletedEmailData {
  recipientName: string
  documentName: string
  requestTitle: string
  participantCount: number
  completedAt: Date
  dashboardUrl: string
}

export function generateAllSignaturesCompletedEmail(data: AllSignaturesCompletedEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All Signatures Completed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #111827; font-size: 28px; font-weight: 700; margin: 0;">
        📝 Insign
      </h1>
      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">
        Digital Signature Platform
      </p>
    </div>

    <!-- Main Card -->
    <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 32px;">
      <!-- Success Icon -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #10b981; border-radius: 50%; width: 80px; height: 80px; line-height: 80px;">
          <span style="color: #ffffff; font-size: 40px;">🎉</span>
        </div>
      </div>

      <!-- Greeting -->
      <h2 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
        All Signatures Collected!
      </h2>

      <p style="color: #111827; font-size: 16px; margin: 0 0 16px 0;">
        Hi ${data.recipientName},
      </p>

      <!-- Message -->
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Great news! All <strong>${data.participantCount} participants</strong> have completed their signatures.
      </p>

      <!-- Document Info -->
      <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #166534; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">
          FULLY EXECUTED DOCUMENT
        </p>
        <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">
          ${data.requestTitle}
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          ${data.documentName}
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0 0;">
          Completed: ${new Date(data.completedAt).toLocaleString()}
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.dashboardUrl}"
           style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
          View in Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        This is an automated message from Insign. Please do not reply to this email.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
        © ${new Date().getFullYear()} Insign. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `
}
