'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documents, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { convertWordToPDF, isConvertibleDocument } from '@/lib/document-converter'
import { revalidatePath } from 'next/cache'

/**
 * Convert a document to PDF if it's a convertible format
 * This is useful for signature requests that require PDFs
 */
export async function convertDocumentToPDF(documentId: string) {
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

    // Get the document
    const document = await db.query.documents.findFirst({
      where: and(
        eq(documents.id, documentId),
        eq(documents.orgId, currentUser.orgId)
      ),
    })

    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    // Check if it's already a PDF
    if (document.mimeType === 'application/pdf') {
      return {
        success: true,
        message: 'Document is already a PDF',
        documentId: document.id,
        pdfUrl: document.filePath,
      }
    }

    // Check if it's convertible
    if (!isConvertibleDocument(document.mimeType)) {
      return {
        success: false,
        error: `Cannot convert ${document.mimeType} to PDF. Only Word documents (.doc, .docx) are supported.`,
      }
    }

    // Convert to PDF
    const conversionResult = await convertWordToPDF(document.filePath, document.name)

    if (!conversionResult.success) {
      return {
        success: false,
        error: conversionResult.error || 'Conversion failed',
      }
    }

    // Create a new PDF document record
    const pdfName = document.name.replace(/\.(docx?|odt)$/i, '.pdf')

    const [pdfDocument] = await db
      .insert(documents)
      .values({
        name: pdfName,
        orgId: currentUser.orgId,
        createdBy: currentUser.id,
        folderId: document.folderId,
        mimeType: 'application/pdf',
        sizeBytes: 0, // Will be updated if we track file size
        filePath: conversionResult.pdfUrl!,
        metadata: {
          convertedFrom: document.id,
          originalMimeType: document.mimeType,
          originalName: document.name,
          conversionDate: new Date().toISOString(),
        },
      })
      .returning()

    revalidatePath('/dashboard/documents')
    revalidatePath('/dashboard/signatures')

    return {
      success: true,
      message: 'Document converted to PDF successfully',
      documentId: pdfDocument.id,
      pdfUrl: pdfDocument.filePath,
      originalDocumentId: document.id,
    }
  } catch (error) {
    console.error('Document conversion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert document',
    }
  }
}
