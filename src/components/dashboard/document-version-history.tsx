'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getDocumentVersions,
  restoreDocumentVersion,
  deleteDocumentVersion,
} from '@/app/actions/versions'
import { History, RotateCcw, Download, Trash2, Upload, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Version {
  id: string
  documentId: string
  version: number
  filePath: string
  sizeBytes: number
  mimeType: string
  changesDescription: string | null
  createdAt: Date | null
  createdByUser: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
}

interface DocumentVersionHistoryProps {
  documentId: string
  documentName: string
  children?: React.ReactNode
}

export function DocumentVersionHistory({
  documentId,
  documentName,
  children,
}: DocumentVersionHistoryProps) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [changesDescription, setChangesDescription] = useState('')

  const loadVersions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await getDocumentVersions(documentId)
    if (result.success && result.data) {
      setVersions(result.data as Version[])
    } else {
      setError(result.error || 'Failed to load versions')
    }
    setIsLoading(false)
  }, [documentId])

  useEffect(() => {
    if (open) {
      loadVersions()
    }
  }, [loadVersions, open])

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Are you sure you want to restore version ${versionNumber}? This will create a new version.`)) {
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await restoreDocumentVersion(documentId, versionId)

    if (result.success) {
      loadVersions()
    } else {
      setError(result.error || 'Failed to restore version')
    }
    setIsLoading(false)
  }

  const handleDelete = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Are you sure you want to delete version ${versionNumber}? This cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await deleteDocumentVersion(versionId)

    if (result.success) {
      loadVersions()
    } else {
      setError(result.error || 'Failed to delete version')
    }
    setIsLoading(false)
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('documentId', documentId)
      if (changesDescription) {
        formData.append('changesDescription', changesDescription)
      }

      // Note: This would need a proper API route to handle file uploads
      // For now, this is a placeholder
      setError('File upload needs to be implemented via API route')
    } catch (err) {
      setError('Failed to upload new version')
    }

    setIsLoading(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatUserName = (user: Version['createdByUser']) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.email
  }

  const getVersionBadgeColor = (index: number) => {
    if (index === 0) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            Version History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History - {documentName}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Upload New Version Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => setShowUploadForm(!showUploadForm)}
              size="sm"
              disabled
              title="File upload requires API route implementation"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New Version
            </Button>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-sm font-medium">Upload New Version</h3>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>File</Label>
                  <Input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Changes Description (Optional)</Label>
                  <Input
                    placeholder="What changed in this version?"
                    value={changesDescription}
                    onChange={(e) => setChangesDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={isLoading || !uploadFile} size="sm">
                  Upload
                </Button>
                <Button
                  onClick={() => {
                    setShowUploadForm(false)
                    setUploadFile(null)
                    setChangesDescription('')
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Version List */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Version History ({versions.length})</h3>

            {isLoading && versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading versions...</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No versions found.</p>
            ) : (
              <div className="space-y-3">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getVersionBadgeColor(
                              index
                            )}`}
                          >
                            Version {version.version}
                            {index === 0 && ' (Current)'}
                          </span>
                          {version.changesDescription && (
                            <span className="text-sm text-muted-foreground">
                              - {version.changesDescription}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {version.createdAt
                              ? new Date(version.createdAt).toLocaleString()
                              : 'N/A'}
                          </div>
                          <div>By: {formatUserName(version.createdByUser)}</div>
                          <div>Size: {formatFileSize(version.sizeBytes)}</div>
                          <div>Type: {version.mimeType.split('/')[1]?.toUpperCase()}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          title="Download this version"
                        >
                          <a href={version.filePath} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>

                        {index !== 0 && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(version.id, version.version)}
                              disabled={isLoading}
                              title="Restore this version"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(version.id, version.version)}
                              disabled={isLoading}
                              title="Delete this version"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="border-t pt-4">
            <h4 className="text-xs font-medium mb-2">Version Control Features:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>All document changes are automatically versioned</li>
              <li>Restore any previous version at any time</li>
              <li>Download any version for offline access</li>
              <li>Current version cannot be deleted</li>
              <li>Restoring creates a new version (non-destructive)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
