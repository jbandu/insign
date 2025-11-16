'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Send, XCircle, Trash2, Loader2 } from 'lucide-react'
import { sendSignatureRequest, cancelSignatureRequest, deleteSignatureRequest } from '@/app/actions/signatures'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface SignatureRequest {
  id: string
  status: string | null
  title: string
}

interface SignatureRequestActionsProps {
  request: SignatureRequest
}

export function SignatureRequestActions({ request }: SignatureRequestActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setIsLoading(true)
    setError(null)

    const result = await sendSignatureRequest(request.id)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to send request')
    }
    setIsLoading(false)
  }

  const handleCancel = async () => {
    setIsLoading(true)
    setError(null)

    const result = await cancelSignatureRequest(request.id)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to cancel request')
    }
    setIsLoading(false)
  }

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)

    const result = await deleteSignatureRequest(request.id)

    if (result.success) {
      router.push('/dashboard/signatures')
      router.refresh()
    } else {
      setError(result.error || 'Failed to delete request')
    }
    setIsLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <p className="text-sm text-destructive mr-2">{error}</p>
      )}

      {request.status === 'draft' && (
        <>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Request
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send Signature Request</AlertDialogTitle>
                <AlertDialogDescription>
                  This will send the signature request to all participants. They will receive
                  email notifications with instructions to sign the document.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSend}>
                  Send Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isLoading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Draft</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this draft? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {request.status && ['sent', 'in_progress'].includes(request.status) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Request
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Signature Request</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this signature request? Participants will no
                longer be able to sign the document.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Request</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
                Cancel Request
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
