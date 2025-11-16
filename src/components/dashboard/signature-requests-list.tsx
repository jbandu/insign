'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileSignature, Eye, Send, XCircle, Trash2, Users } from 'lucide-react'
import { sendSignatureRequest, cancelSignatureRequest, deleteSignatureRequest } from '@/app/actions/signatures'
import { useRouter } from 'next/navigation'

interface SignatureRequest {
  id: string
  title: string
  status: string
  workflowType: string
  createdAt: Date
  document: {
    name: string
  }
  participants: Array<{
    id: string
    email: string
    status: string
  }>
}

interface SignatureRequestsListProps {
  requests: SignatureRequest[]
}

export function SignatureRequestsList({ requests }: SignatureRequestsListProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary'
      case 'sent': case 'in_progress': return 'warning'
      case 'completed': return 'success'
      case 'declined': case 'cancelled': case 'expired': return 'destructive'
      default: return 'outline'
    }
  }

  const handleSend = async (requestId: string) => {
    setLoadingId(requestId)
    const result = await sendSignatureRequest(requestId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Failed to send request')
    }
    setLoadingId(null)
  }

  const handleCancel = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this signature request?')) {
      return
    }

    setLoadingId(requestId)
    const result = await cancelSignatureRequest(requestId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Failed to cancel request')
    }
    setLoadingId(null)
  }

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) {
      return
    }

    setLoadingId(requestId)
    const result = await deleteSignatureRequest(requestId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Failed to delete request')
    }
    setLoadingId(null)
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <FileSignature className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No signature requests yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first signature request to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <FileSignature className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{request.title}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  Document: {request.document.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStatusColor(request.status) as any}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {request.workflowType === 'sequential' ? 'Sequential' : 'Parallel'}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {request.participants.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/signatures/${request.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>

            {request.status === 'draft' && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSend(request.id)}
                  disabled={loadingId === request.id}
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(request.id)}
                  disabled={loadingId === request.id}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}

            {['sent', 'in_progress'].includes(request.status) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancel(request.id)}
                disabled={loadingId === request.id}
              >
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
