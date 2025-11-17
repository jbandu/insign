import { put } from '@vercel/blob'

/**
 * Check if a file type can be converted to PDF
 */
export function isConvertibleDocument(mimeType: string): boolean {
  const convertibleTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/vnd.oasis.opendocument.text', // .odt
  ]
  return convertibleTypes.includes(mimeType)
}

/**
 * Get a user-friendly name for a document type
 */
export function getDocumentTypeName(mimeType: string): string {
  const typeNames: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/msword': 'Word Document (Legacy)',
    'application/vnd.oasis.opendocument.text': 'OpenDocument Text',
  }
  return typeNames[mimeType] || 'Unknown'
}

/**
 * Convert a Word document to PDF
 *
 * This uses CloudConvert API for conversion. To enable:
 * 1. Sign up at https://cloudconvert.com
 * 2. Get API key from dashboard
 * 3. Add to .env: CLOUDCONVERT_API_KEY=your_key_here
 *
 * Free tier: 25 conversions/day
 * Alternative: Set DOCUMENT_CONVERSION_DISABLED=true to disable
 *
 * NOTE: This is NOT a server action - it's called from server actions
 */
export async function convertWordToPDF(
  fileUrl: string,
  filename: string
): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  try {
    // Check if conversion is disabled
    if (process.env.DOCUMENT_CONVERSION_DISABLED === 'true') {
      return {
        success: false,
        error: 'Document conversion is disabled. Please upload PDF files only.',
      }
    }

    // Check if API key is configured
    const apiKey = process.env.CLOUDCONVERT_API_KEY
    if (!apiKey) {
      return {
        success: false,
        error: 'Document conversion not configured. Please set CLOUDCONVERT_API_KEY environment variable.',
      }
    }

    // Step 1: Create a conversion job
    const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-file': {
            operation: 'import/url',
            url: fileUrl,
          },
          'convert-file': {
            operation: 'convert',
            input: 'import-file',
            output_format: 'pdf',
            engine: 'office',
          },
          'export-file': {
            operation: 'export/url',
            input: 'convert-file',
          },
        },
      }),
    })

    if (!createJobResponse.ok) {
      const error = await createJobResponse.text()
      console.error('CloudConvert job creation failed:', error)
      return {
        success: false,
        error: 'Failed to create conversion job',
      }
    }

    const job = await createJobResponse.json()
    const jobId = job.data.id

    // Step 2: Wait for job to complete (poll every 2 seconds, max 30 seconds)
    let attempts = 0
    const maxAttempts = 15
    let jobStatus = null

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (!statusResponse.ok) {
        return {
          success: false,
          error: 'Failed to check conversion status',
        }
      }

      jobStatus = await statusResponse.json()

      if (jobStatus.data.status === 'finished') {
        break
      }

      if (jobStatus.data.status === 'error') {
        return {
          success: false,
          error: 'Document conversion failed',
        }
      }

      attempts++
    }

    if (!jobStatus || jobStatus.data.status !== 'finished') {
      return {
        success: false,
        error: 'Document conversion timed out',
      }
    }

    // Step 3: Get the converted PDF URL
    const exportTask = jobStatus.data.tasks.find((t: any) => t.name === 'export-file')
    if (!exportTask || !exportTask.result?.files?.[0]?.url) {
      return {
        success: false,
        error: 'Converted PDF not found',
      }
    }

    const convertedPdfUrl = exportTask.result.files[0].url

    // Step 4: Download the PDF and upload to Vercel Blob
    const pdfResponse = await fetch(convertedPdfUrl)
    if (!pdfResponse.ok) {
      return {
        success: false,
        error: 'Failed to download converted PDF',
      }
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfFilename = filename.replace(/\.(docx?|odt)$/i, '.pdf')

    // Upload to Vercel Blob
    const blob = await put(pdfFilename, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
    })

    return {
      success: true,
      pdfUrl: blob.url,
    }
  } catch (error) {
    console.error('Word to PDF conversion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert document',
    }
  }
}
