'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { createDocumentShare, getDocumentShares, revokeDocumentShare } from '@/app/actions/document-shares'
import { Share2, Copy, Loader2, Check, X, Lock, Calendar, Eye, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface ShareDocumentDialogProps {
  documentId: string
  documentName: string
  children?: React.ReactNode
}

export function ShareDocumentDialog({ documentId, documentName, children }: ShareDocumentDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [expiresIn, setExpiresIn] = useState<string>('never')
  const [maxAccess, setMaxAccess] = useState<string>('')
  const [shares, setShares] = useState<any[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // Load existing shares
      await loadShares()
    }
  }

  const loadShares = async () => {
    const result = await getDocumentShares(documentId)
    if (result.success && result.data) {
      setShares(result.data)
    }
  }

  const handleCreateShare = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Calculate expiration date
      let expiresAt: string | undefined
      if (expiresIn !== 'never') {
        const now = new Date()
        const expiration = new Date(now)

        switch (expiresIn) {
          case '1hour':
            expiration.setHours(now.getHours() + 1)
            break
          case '1day':
            expiration.setDate(now.getDate() + 1)
            break
          case '7days':
            expiration.setDate(now.getDate() + 7)
            break
          case '30days':
            expiration.setDate(now.getDate() + 30)
            break
        }

        expiresAt = expiration.toISOString()
      }

      const result = await createDocumentShare({
        documentId,
        password: password || undefined,
        expiresAt,
        maxAccessCount: maxAccess ? parseInt(maxAccess) : undefined,
      })

      if (result.success && result.data) {
        // Reset form
        setPassword('')
        setExpiresIn('never')
        setMaxAccess('')

        // Reload shares
        await loadShares()

        router.refresh()
      } else {
        setError(result.error || 'Failed to create share link')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async (shareUrl: string, shareId: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedId(shareId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this share link? It will no longer be accessible.')) {
      return
    }

    const result = await revokeDocumentShare(shareId)
    if (result.success) {
      await loadShares()
      router.refresh()
    }
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString()
  }

  const isExpired = (date: Date | string | null) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Create a secure link to share "{documentName}" with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Share */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Create New Share Link</h3>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Password Protection */}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password Protection (Optional)
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for no password"
                />
                <p className="text-xs text-muted-foreground">
                  Require a password to access this shared document
                </p>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <Label htmlFor="expires" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Link Expiration
                </Label>
                <select
                  id="expires"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="never">Never expires</option>
                  <option value="1hour">1 hour</option>
                  <option value="1day">1 day</option>
                  <option value="7days">7 days</option>
                  <option value="30days">30 days</option>
                </select>
              </div>

              {/* Max Access Count */}
              <div className="space-y-2">
                <Label htmlFor="maxAccess" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Maximum Access Count (Optional)
                </Label>
                <Input
                  id="maxAccess"
                  type="number"
                  min="1"
                  value={maxAccess}
                  onChange={(e) => setMaxAccess(e.target.value)}
                  placeholder="Unlimited"
                />
                <p className="text-xs text-muted-foreground">
                  Limit how many times this link can be accessed
                </p>
              </div>

              <Button onClick={handleCreateShare} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Create Share Link
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Existing Shares */}
          {shares.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Active Share Links</h3>
              {shares.map((share) => {
                const expired = isExpired(share.expiresAt)
                const limitReached = share.maxAccessCount && share.accessCount >= share.maxAccessCount

                return (
                  <Card key={share.id} className="p-4">
                    <div className="space-y-3">
                      {/* Share URL */}
                      <div className="flex items-center gap-2">
                        <Input
                          value={share.shareUrl}
                          readOnly
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(share.shareUrl, share.id)}
                        >
                          {copiedId === share.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeShare(share.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Share Info */}
                      <div className="flex flex-wrap gap-2">
                        {share.passwordHash && (
                          <Badge variant="secondary">
                            <Lock className="h-3 w-3 mr-1" />
                            Password Protected
                          </Badge>
                        )}

                        {expired ? (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        ) : share.expiresAt ? (
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            Expires: {formatDate(share.expiresAt)}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            No Expiration
                          </Badge>
                        )}

                        {limitReached ? (
                          <Badge variant="destructive">
                            <Eye className="h-3 w-3 mr-1" />
                            Access Limit Reached
                          </Badge>
                        ) : share.maxAccessCount ? (
                          <Badge variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Accessed: {share.accessCount} / {share.maxAccessCount}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Accessed: {share.accessCount} times
                          </Badge>
                        )}
                      </div>

                      {share.lastAccessedAt && (
                        <p className="text-xs text-muted-foreground">
                          Last accessed: {formatDate(share.lastAccessedAt)}
                        </p>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
