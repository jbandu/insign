'use client'

import { pdfjs } from 'react-pdf'

// Configure PDF.js worker once globally
// This prevents multiple worker loads that cause flickering
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs'
}

export { pdfjs }
