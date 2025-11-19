import { getDocuments, getStorageUsage } from '@/app/actions/documents'
import { getFolders } from '@/app/actions/folders'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { DocumentsList } from '@/components/dashboard/documents-list'
import { DocumentUpload } from '@/components/dashboard/document-upload'
import { DocumentSearch } from '@/components/dashboard/document-search'
import { ManageTagsDialog } from '@/components/dashboard/manage-tags-dialog'
import Link from 'next/link'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { search?: string; folder?: string }
}) {
  const [documentsResult, foldersResult, storageResult] = await Promise.all([
    getDocuments(searchParams.search, searchParams.folder),
    getFolders(),
    getStorageUsage(),
  ])

  if (!documentsResult.success) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{documentsResult.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const documentsList = documentsResult.data || []
  const foldersList = foldersResult.success ? foldersResult.data || [] : []
  const storage = storageResult.success ? storageResult.data : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">
            Upload, organize, and manage your documents
          </p>
        </div>
        <div className="flex gap-2">
          <ManageTagsDialog />
          <DocumentUpload folders={foldersList} />
        </div>
      </div>

      {/* Storage Usage */}
      {storage && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage Used</span>
                <span className="font-medium">
                  {(storage.usedBytes / 1024 / 1024).toFixed(2)} MB / {(storage.totalBytes / 1024 / 1024 / 1024).toFixed(0)} GB
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${Math.min(storage.percentage, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <DocumentSearch />

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>
            {documentsList.length} {documentsList.length === 1 ? 'document' : 'documents'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsList documents={documentsList} />
        </CardContent>
      </Card>
    </div>
  )
}
