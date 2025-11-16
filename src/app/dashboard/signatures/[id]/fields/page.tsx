import { getSignatureRequest } from '@/app/actions/signatures'
import { getSignatureFields } from '@/app/actions/signature-fields'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { SignatureFieldEditor } from '@/components/dashboard/signature-field-editor'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

interface SignatureFieldsPageProps {
  params: {
    id: string
  }
}

export default async function SignatureFieldsPage({ params }: SignatureFieldsPageProps) {
  const requestResult = await getSignatureRequest(params.id)

  if (!requestResult.success) {
    if (requestResult.error === 'Signature request not found') {
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
          <h2 className="text-3xl font-bold tracking-tight">Place Signature Fields</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{requestResult.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const request = requestResult.data

  // Only allow field placement for draft requests
  if (request.status !== 'draft') {
    redirect(`/dashboard/signatures/${params.id}`)
  }

  const fieldsResult = await getSignatureFields(params.id)
  const existingFields = fieldsResult.success ? fieldsResult.data || [] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/signatures/${params.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Place Signature Fields</h2>
            <p className="text-muted-foreground">
              {request.title}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/signatures/${params.id}`}>
            Done
          </Link>
        </Button>
      </div>

      <SignatureFieldEditor
        request={request}
        existingFields={existingFields}
      />
    </div>
  )
}
