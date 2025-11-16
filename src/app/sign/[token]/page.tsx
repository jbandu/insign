import { getSigningSession } from '@/app/actions/sign'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SignatureCanvas } from '@/components/sign/signature-canvas'
import { FileSignature, CheckCircle2, XCircle } from 'lucide-react'
import { notFound } from 'next/navigation'

interface SignPageProps {
  params: {
    token: string
  }
}

export default async function SignPage({ params }: SignPageProps) {
  const result = await getSigningSession(params.token)

  if (!result.success) {
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
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { participant, request, fields, existingSignatures } = result.data

  // Check if already completed
  if (participant.status === 'signed' || participant.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <CardTitle>Signature Complete</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You have successfully signed this document.
            </p>
            {participant.signedAt && (
              <p className="text-sm text-muted-foreground">
                Signed on: {new Date(participant.signedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileSignature className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">{request.title}</CardTitle>
                <CardDescription>Please review and sign the document</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Document</p>
                <p className="text-sm text-muted-foreground">{request.document.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Your Name</p>
                <p className="text-sm text-muted-foreground">{participant.fullName}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Your Email</p>
                <p className="text-sm text-muted-foreground">{participant.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Role</p>
                <Badge variant="outline">{participant.role}</Badge>
              </div>
            </div>

            {request.message && (
              <div>
                <p className="text-sm font-medium mb-1">Message</p>
                <p className="text-sm text-muted-foreground">{request.message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document and Signature Interface */}
        <SignatureCanvas
          accessToken={params.token}
          document={request.document}
          fields={fields}
          existingSignatures={existingSignatures}
          participant={participant}
        />
      </div>
    </div>
  )
}
