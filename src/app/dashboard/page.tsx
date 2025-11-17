import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, documents, signatureRequests } from '@/lib/db/schema'
import { eq, count, desc, and } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, FileSignature, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  // Get user with org
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!currentUser || !currentUser.orgId) {
    return null
  }

  // Get actual stats from database
  const [usersCount] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.orgId, currentUser.orgId))

  const [documentsCount] = await db
    .select({ count: count() })
    .from(documents)
    .where(eq(documents.orgId, currentUser.orgId))

  const [pendingCount] = await db
    .select({ count: count() })
    .from(signatureRequests)
    .where(and(
      eq(signatureRequests.orgId, currentUser.orgId),
      eq(signatureRequests.status, 'sent')
    ))

  const [completedCount] = await db
    .select({ count: count() })
    .from(signatureRequests)
    .where(and(
      eq(signatureRequests.orgId, currentUser.orgId),
      eq(signatureRequests.status, 'completed')
    ))

  const stats = {
    totalUsers: usersCount?.count || 0,
    totalDocuments: documentsCount?.count || 0,
    pendingSignatures: pendingCount?.count || 0,
    completedSignatures: completedCount?.count || 0,
  }

  // Get recent documents
  const recentDocuments = await db.query.documents.findMany({
    where: eq(documents.orgId, currentUser.orgId),
    orderBy: desc(documents.createdAt),
    limit: 5,
    with: {
      createdByUser: {
        columns: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })

  // Get recent signature requests
  const recentSignatureRequests = await db.query.signatureRequests.findMany({
    where: eq(signatureRequests.orgId, currentUser.orgId),
    orderBy: desc(signatureRequests.createdAt),
    limit: 5,
    with: {
      document: true,
      participants: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back, {currentUser?.firstName || session.user.email}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active users in your organization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Total documents stored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Signatures
            </CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingSignatures}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting signature
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedSignatures}</div>
            <p className="text-xs text-muted-foreground">
              Signatures completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>
              Your recently uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents yet</p>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/dashboard/documents`}
                    className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.createdByUser?.firstName && doc.createdByUser?.lastName
                          ? `${doc.createdByUser.firstName} ${doc.createdByUser.lastName}`
                          : doc.createdByUser?.email || 'Unknown'}
                        {' • '}
                        {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Signature Requests</CardTitle>
            <CardDescription>
              Your recent signature requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSignatureRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No signature requests yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentSignatureRequests.map((request) => {
                  const statusColors = {
                    draft: 'bg-gray-500',
                    sent: 'bg-blue-500',
                    in_progress: 'bg-yellow-500',
                    completed: 'bg-green-500',
                    declined: 'bg-red-500',
                    expired: 'bg-gray-400',
                  }

                  return (
                    <Link
                      key={request.id}
                      href={`/dashboard/signatures/${request.id}`}
                      className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.participants.length} participant{request.participants.length !== 1 ? 's' : ''}
                          {' • '}
                          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`${statusColors[request.status || 'draft']} text-white flex-shrink-0 ml-2`}
                      >
                        {request.status}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
