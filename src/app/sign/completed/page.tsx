import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export default function SignatureCompletedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <CardTitle>Signature Completed</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Thank you! You have successfully signed this document.
          </p>
          <p className="text-sm text-muted-foreground">
            All participants will be notified when the signing process is complete.
          </p>
          <p className="text-sm text-muted-foreground">
            You can now close this window.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
