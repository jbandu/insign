import { getSignatureRequest } from '@/app/actions/signatures'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Calendar, Users, CheckCircle2, Clock, XCircle, Mail, Edit } from 'lucide-react'
import { SignatureRequestActions } from '@/components/dashboard/signature-request-actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface SignatureRequestDetailPageProps {
  params: {
    id: string
  }
}

export default async function SignatureRequestDetailPage({ params }: SignatureRequestDetailPageProps) {
  const result = await getSignatureRequest(params.id)

  if (!result.success) {
    if (result.error === 'Signature request not found') {
      notFound()
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/signatures">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Signature Request</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const request = result.data

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary'
      case 'sent': case 'in_progress': return 'warning'
      case 'completed': return 'success'
      case 'declined': case 'cancelled': case 'expired': return 'destructive'
      default: return 'outline'
    }
  }

  const getParticipantStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': case 'signed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'pending': return <Clock className="h-4 w-4 text-gray-400" />
      case 'notified': return <Mail className="h-4 w-4 text-blue-600" />
      case 'declined': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const completedParticipants = request.participants.filter(p =>
    p.status === 'completed' || p.status === 'signed'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/signatures">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{request.title}</h2>
            <p className="text-muted-foreground">
              Signature request details and progress
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {request.status === 'draft' && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/signatures/${request.id}/fields`}>
                <Edit className="h-4 w-4 mr-2" />
                Place Fields
              </Link>
            </Button>
          )}
          <SignatureRequestActions request={request} />
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={getStatusColor(request.status) as any} className="text-sm">
              {request.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflow Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {request.workflowType === 'sequential' ? 'Sequential' : 'Parallel'}
            </div>
            <p className="text-xs text-muted-foreground">
              {request.workflowType === 'sequential'
                ? 'One at a time'
                : 'All at once'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedParticipants}/{request.participants.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Participants completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {new Date(request.createdAt).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(request.createdAt).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Document Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">{request.document.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(request.document.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {request.document.blobUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={request.document.blobUrl} target="_blank" rel="noopener noreferrer">
                  View Document
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Message */}
        {request.message && (
          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{request.message}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants
          </CardTitle>
          <CardDescription>
            {request.participants.length} {request.participants.length === 1 ? 'participant' : 'participants'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {request.participants.map((participant, index) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{participant.fullName}</p>
                    <p className="text-sm text-muted-foreground">{participant.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {participant.role}
                      </Badge>
                      {participant.notifiedAt && (
                        <span className="text-xs text-muted-foreground">
                          Notified: {new Date(participant.notifiedAt).toLocaleString()}
                        </span>
                      )}
                      {participant.signedAt && (
                        <span className="text-xs text-muted-foreground">
                          Signed: {new Date(participant.signedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getParticipantStatusIcon(participant.status)}
                  <Badge variant={getStatusColor(participant.status) as any}>
                    {participant.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Signature Fields */}
      {request.fields && request.fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Signature Fields</CardTitle>
            <CardDescription>
              {request.fields.length} field{request.fields.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {request.fields.map((field, index) => (
                <div key={field.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium text-sm">
                      {field.fieldType.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Page {field.pageNumber} - Position: ({field.positionX}, {field.positionY})
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {field.isRequired ? 'Required' : 'Optional'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiration Info */}
      {request.expiresAt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Expiration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              This request will expire on{' '}
              <span className="font-medium">
                {new Date(request.expiresAt).toLocaleDateString()}
              </span>{' '}
              at{' '}
              <span className="font-medium">
                {new Date(request.expiresAt).toLocaleTimeString()}
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
