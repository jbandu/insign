'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Trash2, FolderOpen, File, Shield, History, Share2 } from 'lucide-react'
import { deleteDocument } from '@/app/actions/documents'
import { ShareDocumentDialog } from './share-document-dialog'
import { useRouter } from 'next/navigation'
import { DocumentTagSelector } from './document-tag-selector'
import { ManagePermissionsDialog } from './manage-permissions-dialog'
import { DocumentVersionHistory } from './document-version-history'

interface Document {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  filePath: string
  createdAt: Date | null
  folder?: {
    name: string
  } | null
}

interface DocumentsListProps {
  documents: Document[]
}

export function DocumentsList({ documents }: DocumentsListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    setDeletingId(documentId)
    const result = await deleteDocument(documentId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Failed to delete document')
    }
    setDeletingId(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <File className="h-5 w-5 text-blue-500" />
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileText className="h-5 w-5 text-blue-600" />
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileText className="h-5 w-5 text-green-600" />
    }
    return <File className="h-5 w-5 text-gray-500" />
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your first document to get started
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Tags</th>
            <th className="pb-3 font-medium">Size</th>
            <th className="pb-3 font-medium">Folder</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Uploaded</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {documents.map((doc) => (
            <tr key={doc.id} className="text-sm">
              <td className="py-3">
                <div className="flex items-center gap-3">
                  {getFileIcon(doc.mimeType)}
                  <span className="font-medium">{doc.name}</span>
                </div>
              </td>
              <td className="py-3">
                <DocumentTagSelector
                  documentId={doc.id}
                  onTagsChange={() => router.refresh()}
                />
              </td>
              <td className="py-3 text-muted-foreground">
                {formatFileSize(doc.sizeBytes)}
              </td>
              <td className="py-3">
                {doc.folder ? (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <FolderOpen className="h-3 w-3" />
                    <span className="text-xs">{doc.folder.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No folder</span>
                )}
              </td>
              <td className="py-3">
                <Badge variant="outline" className="text-xs">
                  {doc.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                </Badge>
              </td>
              <td className="py-3 text-muted-foreground">
                {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}
              </td>
              <td className="py-3">
                <div className="flex items-center justify-end gap-2">
                  <DocumentVersionHistory documentId={doc.id} documentName={doc.name}>
                    <Button variant="ghost" size="sm">
                      <History className="h-4 w-4" />
                    </Button>
                  </DocumentVersionHistory>
                  <ManagePermissionsDialog documentId={doc.id} documentName={doc.name}>
                    <Button variant="ghost" size="sm">
                      <Shield className="h-4 w-4" />
                    </Button>
                  </ManagePermissionsDialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={doc.filePath} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <ShareDocumentDialog documentId={doc.id} documentName={doc.name}>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </ShareDocumentDialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
