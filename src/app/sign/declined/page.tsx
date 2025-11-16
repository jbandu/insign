import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle } from 'lucide-react'

export default function SignatureDeclinedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-6 w-6 text-orange-600" />
            <CardTitle>Signature Declined</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You have declined to sign this document. The document creator has been notified.
          </p>
          <p className="text-sm text-muted-foreground">
            You can now close this window.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
