'use server'

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { db } from '@/lib/db'
import { signatures, signatureFields, signatureRequests, documents } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { put } from '@vercel/blob'

export async function generateSignedPDF(requestId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Get the signature request with document
    const request = await db.query.signatureRequests.findFirst({
      where: eq(signatureRequests.id, requestId),
      with: {
        document: true,
      },
    })

    if (!request || !request.document) {
      return { success: false, error: 'Signature request or document not found' }
    }

    // Fetch the original PDF
    const originalPdfUrl = request.document.filePath
    const pdfResponse = await fetch(originalPdfUrl)

    if (!pdfResponse.ok) {
      return { success: false, error: 'Failed to fetch original PDF' }
    }

    const originalPdfBytes = await pdfResponse.arrayBuffer()

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(originalPdfBytes)

    // Get all fields for this request
    const allFields = await db.query.signatureFields.findMany({
      where: eq(signatureFields.requestId, requestId),
    })

    // Get all signatures for this request by fetching all field IDs
    const fieldIds = allFields.map(f => f.id)

    const allSignatures = fieldIds.length > 0
      ? await db.query.signatures.findMany({
          where: inArray(signatures.fieldId, fieldIds),
        })
      : []

    // Create a map of field ID to field data for quick lookup
    const fieldMap = new Map(allFields.map(f => [f.id, f]))

    // Embed the font for text signatures
    const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Generate or use existing audit ID (seal hash)
    let auditId = request.sealHash
    if (!auditId) {
      // Generate a unique audit ID using timestamp and request ID
      const timestamp = Date.now().toString(36)
      const randomPart = Math.random().toString(36).substring(2, 10)
      auditId = `AUD-${timestamp}-${randomPart}`.toUpperCase()

      // Update the request with the audit ID
      await db
        .update(signatureRequests)
        .set({ sealHash: auditId })
        .where(eq(signatureRequests.id, requestId))
    }

    // Add audit ID footer to every page
    const pages = pdfDoc.getPages()
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const pageHeight = page.getHeight()
      const pageWidth = page.getWidth()

      // Add audit ID at the bottom center of each page
      const auditText = `Document ID: ${auditId} | Page ${i + 1} of ${pages.length}`
      const textWidth = helvetica.widthOfTextAtSize(auditText, 8)

      page.drawText(auditText, {
        x: (pageWidth - textWidth) / 2,
        y: 20,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    // Process each signature
    for (const sig of allSignatures) {
      const field = fieldMap.get(sig.fieldId)

      if (!field) {
        console.warn(`Field not found for signature ${sig.id}`)
        continue
      }

      // Get the page (0-indexed)
      const pageIndex = field.pageNumber - 1

      if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
        console.warn(`Invalid page number ${field.pageNumber} for signature ${sig.id}`)
        continue
      }

      const page = pdfDoc.getPage(pageIndex)
      const pageHeight = page.getHeight()

      // Convert coordinates (PDF coordinate system has origin at bottom-left)
      const pdfY = pageHeight - field.y - field.height

      if (sig.signatureType === 'drawn') {
        try {
          // Signature data is base64 PNG - need to remove data URL prefix if present
          let base64Data = sig.signatureData
          if (base64Data.startsWith('data:image/png;base64,')) {
            base64Data = base64Data.replace('data:image/png;base64,', '')
          }

          // Convert base64 to bytes
          const imageBytes = Buffer.from(base64Data, 'base64')

          // Embed the PNG image
          const pngImage = await pdfDoc.embedPng(imageBytes)

          // Draw the image on the page
          page.drawImage(pngImage, {
            x: field.x,
            y: pdfY,
            width: field.width,
            height: field.height,
          })
        } catch (error) {
          console.error(`Failed to embed signature image for ${sig.id}:`, error)
          // Fall back to text if image fails
          page.drawText(sig.signatureData.substring(0, 50), {
            x: field.x,
            y: pdfY + field.height / 2,
            size: 12,
            font: helvetica,
            color: rgb(0, 0, 0),
          })
        }
      } else if (sig.signatureType === 'typed') {
        // Draw text signature
        const fontSize = Math.min(field.height * 0.6, 24)

        page.drawText(sig.signatureData, {
          x: field.x + 5, // Small padding
          y: pdfY + (field.height / 2) - (fontSize / 3), // Center vertically
          size: fontSize,
          font: timesRomanItalic,
          color: rgb(0, 0, 0),
        })
      }

      // Optionally add timestamp below signature field
      if (sig.timestamp && field.height > 40) {
        const dateStr = new Date(sig.timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })

        page.drawText(`Signed: ${dateStr}`, {
          x: field.x,
          y: pdfY - 12,
          size: 8,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5),
        })
      }
    }

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save()

    // Upload to Vercel Blob
    const filename = `signed-${request.document.name || 'document'}-${Date.now()}.pdf`

    const blob = await put(filename, pdfBytes, {
      access: 'public',
      contentType: 'application/pdf',
    })

    // Update the signature request with the signed PDF URL
    await db
      .update(signatureRequests)
      .set({
        certificateUrl: blob.url,
        completedAt: new Date(),
      })
      .where(eq(signatureRequests.id, requestId))

    return { success: true, url: blob.url }
  } catch (error) {
    console.error('Generate signed PDF error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate signed PDF' }
  }
}
