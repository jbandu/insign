import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, documents, signatureRequests } from '@/lib/db/schema'
import { eq, count, desc, and } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, FileSignature, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'


export default async function DashboardPage() {
  const session = await auth()
  const t = await getTranslations('dashboard')

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
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">
          {t('welcome', { name: currentUser?.firstName || session.user.email || 'User' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.totalUsersDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.documents')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.documentsDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.pendingSignatures')}
            </CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingSignatures}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.pendingSignaturesDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.completed')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedSignatures}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.completedDesc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('recentDocuments')}</CardTitle>
            <CardDescription>
              {t('recentDocumentsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noDocuments')}</p>
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
                        {doc.createdAt && (
                          <>
                            {' • '}
                            {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                          </>
                        )}
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
            <CardTitle>{t('recentSignatureRequests')}</CardTitle>
            <CardDescription>
              {t('recentSignatureRequestsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSignatureRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('noSignatureRequests')}
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
                    cancelled: 'bg-gray-400',
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
                          {request.participants.length} {request.participants.length !== 1 ? t('participants') : t('participant')}
                          {request.createdAt && (
                            <>
                              {' • '}
                              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                            </>
                          )}
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
