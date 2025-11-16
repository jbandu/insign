'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileSignature,
  Send,
  CheckCircle2,
  XCircle,
  Mail,
  Edit,
  Trash2,
  UserPlus,
  Clock
} from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  timestamp: Date
  participantId: string | null
  metadata: any
}

interface AuditTrailProps {
  logs: AuditLog[]
}

export function AuditTrail({ logs }: AuditTrailProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'request_created':
        return <FileSignature className="h-4 w-4" />
      case 'request_updated':
        return <Edit className="h-4 w-4" />
      case 'request_sent':
        return <Send className="h-4 w-4" />
      case 'request_cancelled':
      case 'request_declined':
        return <XCircle className="h-4 w-4" />
      case 'request_completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'participant_notified':
        return <Mail className="h-4 w-4" />
      case 'participant_signed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'participant_declined':
        return <XCircle className="h-4 w-4" />
      case 'field_signed':
        return <Edit className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'request_created':
        return 'bg-blue-500'
      case 'request_sent':
      case 'participant_notified':
        return 'bg-purple-500'
      case 'request_completed':
      case 'participant_signed':
      case 'field_signed':
        return 'bg-green-500'
      case 'request_cancelled':
      case 'participant_declined':
        return 'bg-red-500'
      case 'request_updated':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getActionLabel = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getActionDescription = (log: AuditLog) => {
    const metadata = log.metadata || {}

    switch (log.action) {
      case 'request_created':
        return `Created signature request: ${metadata.title || 'Untitled'}`
      case 'request_updated':
        return 'Updated signature request details'
      case 'request_sent':
        return `Sent to ${metadata.participantCount || 0} participant(s) - ${metadata.workflowType || 'sequential'} workflow`
      case 'request_completed':
        return 'All participants have signed the document'
      case 'request_cancelled':
        return `Cancelled by ${metadata.cancelledBy || 'user'}`
      case 'participant_notified':
        return `Notified ${metadata.participantEmail || 'participant'}`
      case 'participant_signed':
        return `${metadata.participantEmail || 'Participant'} completed their signature`
      case 'participant_declined':
        return `${metadata.participantEmail || 'Participant'} declined - ${metadata.reason || 'No reason provided'}`
      case 'field_signed':
        return `Signed ${metadata.signatureType || 'field'} field`
      default:
        return getActionLabel(log.action)
    }
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>No activity recorded yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
        <CardDescription>
          Complete history of all actions on this signature request
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-gray-200" />

          {logs.map((log, index) => (
            <div key={log.id} className="relative flex gap-4 items-start">
              {/* Timeline dot */}
              <div
                className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full ${getActionColor(log.action)} text-white flex-shrink-0`}
              >
                {getActionIcon(log.action)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {getActionLabel(log.action)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground">
                  {getActionDescription(log)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
