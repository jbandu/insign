'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { verifyShareAccess } from '@/app/actions/document-shares'
import { FileText, Lock, Loader2, XCircle, Download, Eye } from 'lucide-react'

interface SharePageProps {
  params: {
    token: string
  }
}

export default function SharePage({ params }: SharePageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [document, setDocument] = useState<any | null>(null)
  const [shareInfo, setShareInfo] = useState<any | null>(null)

  useEffect(() => {
    // Attempt to verify access without password first
    verifyAccess()
  }, [params.token])

  const verifyAccess = async (pwd?: string) => {
    setIsLoading(true)
    setError(null)

    const result = await verifyShareAccess(params.token, pwd)

    if (result.success && result.data) {
      setDocument(result.data.document)
      setShareInfo(result.data.share)
      setRequiresPassword(false)
    } else {
      if ((result as any).requiresPassword) {
        setRequiresPassword(true)
      } else {
        setError(result.error || 'Failed to access shared document')
      }
    }

    setIsLoading(false)
  }

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    await verifyAccess(password)
  }

  const handleDownload = () => {
    if (document?.filePath) {
      window.open(document.filePath, '_blank')
    }
  }

  // Loading state
  if (isLoading && !requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying access...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Password required
  if (requiresPassword && !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-6 w-6 text-primary" />
              <CardTitle>Password Protected</CardTitle>
            </div>
            <CardDescription>
              This document is password protected. Enter the password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPassword} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Access Document
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && !requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Unable to Access Document</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success - show document
  if (document) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-2xl">{document.name}</CardTitle>
                    <CardDescription>Shared Document</CardDescription>
                  </div>
                </div>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <p className="font-medium">File Type</p>
                  <p className="text-muted-foreground">{document.mimeType}</p>
                </div>
                <div>
                  <p className="font-medium">Size</p>
                  <p className="text-muted-foreground">
                    {(document.sizeBytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {shareInfo?.expiresAt && (
                  <div>
                    <p className="font-medium">Link Expires</p>
                    <p className="text-muted-foreground">
                      {new Date(shareInfo.expiresAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {shareInfo?.maxAccessCount && (
                  <div>
                    <p className="font-medium">Access Count</p>
                    <p className="text-muted-foreground">
                      {shareInfo.accessCount} / {shareInfo.maxAccessCount}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
              <CardDescription>
                {document.mimeType.startsWith('image/') ? 'Image preview' : 'Document content'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {document.mimeType.startsWith('image/') ? (
                <div className="flex justify-center">
                  <img
                    src={document.filePath}
                    alt={document.name}
                    className="max-w-full h-auto rounded-lg border"
                  />
                </div>
              ) : document.mimeType === 'application/pdf' ? (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={document.filePath}
                    className="w-full h-[600px]"
                    title={document.name}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Preview not available for this file type.</p>
                  <p className="text-sm mt-2">Click the download button to view the file.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Shared securely via Insign</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
