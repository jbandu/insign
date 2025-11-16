import { getSignatureRequests } from '@/app/actions/signatures'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileSignature, Plus } from 'lucide-react'
import { SignatureRequestsList } from '@/components/dashboard/signature-requests-list'
import Link from 'next/link'

export default async function SignaturesPage() {
  const result = await getSignatureRequests()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Signatures</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const requests = result.data || []

  // Group by status
  const drafts = requests.filter(r => r.status === 'draft')
  const pending = requests.filter(r => r.status && ['sent', 'in_progress'].includes(r.status))
  const completed = requests.filter(r => r.status === 'completed')
  const other = requests.filter(r => r.status && ['declined', 'expired', 'cancelled'].includes(r.status))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Signature Requests</h2>
          <p className="text-muted-foreground">
            Manage and track document signature workflows
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/signatures/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drafts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <FileSignature className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <FileSignature className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Other</CardTitle>
            <FileSignature className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{other.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>
            {requests.length} {requests.length === 1 ? 'request' : 'requests'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignatureRequestsList requests={requests} />
        </CardContent>
      </Card>
    </div>
  )
}
