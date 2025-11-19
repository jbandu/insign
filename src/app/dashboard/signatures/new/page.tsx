import { getDocuments } from '@/app/actions/documents'
import { SignatureRequestWizard } from '@/components/dashboard/signature-request-wizard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'


export default async function NewSignatureRequestPage() {
  const documentsResult = await getDocuments()

  if (!documentsResult.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/signatures">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">New Signature Request</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{documentsResult.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const documents = documentsResult.data || []

  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/signatures">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">New Signature Request</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              You need to upload documents before creating signature requests.{' '}
              <Link href="/dashboard/documents" className="text-primary hover:underline">
                Upload a document
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/signatures">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Signature Request</h2>
          <p className="text-muted-foreground">
            Follow the wizard to create and send your signature request
          </p>
        </div>
      </div>

      <SignatureRequestWizard documents={documents} />
    </div>
  )
}
