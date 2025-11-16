import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, documents, folders, signatureRequests } from '@/lib/db/schema'
import { eq, and, count, sql, isNull, desc } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, FileText, Folder, Users, TrendingUp, Clock } from 'lucide-react'

export default async function ReportsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!currentUser) {
    return null
  }

  // Get stats
  const [
    totalUsersResult,
    totalDocumentsResult,
    totalFoldersResult,
    recentDocuments,
    userStats,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(users)
      .where(eq(users.orgId, currentUser.orgId)),
    db
      .select({ count: count() })
      .from(documents)
      .where(
        and(eq(documents.orgId, currentUser.orgId), isNull(documents.deletedAt))
      ),
    db
      .select({ count: count() })
      .from(folders)
      .where(
        and(eq(folders.orgId, currentUser.orgId), isNull(folders.deletedAt))
      ),
    db.query.documents.findMany({
      where: and(
        eq(documents.orgId, currentUser.orgId),
        isNull(documents.deletedAt)
      ),
      orderBy: desc(documents.createdAt),
      limit: 5,
    }),
    db
      .select({
        count: count(),
        status: users.status,
      })
      .from(users)
      .where(eq(users.orgId, currentUser.orgId))
      .groupBy(users.status),
  ])

  const totalUsers = totalUsersResult[0]?.count || 0
  const totalDocuments = totalDocumentsResult[0]?.count || 0
  const totalFolders = totalFoldersResult[0]?.count || 0

  const activeUsers = userStats.find((s) => s.status === 'active')?.count || 0
  const inactiveUsers = userStats.find((s) => s.status === 'inactive')?.count || 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-muted-foreground">
          View insights and analytics for your organization
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeUsers} active, {inactiveUsers} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all folders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folders</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFolders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Organization structure
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{recentDocuments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Recent uploads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Latest uploaded documents</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent documents</p>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {(doc.sizeBytes / 1024 / 1024).toFixed(1)} MB
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
            <CardDescription>User status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Active Users</span>
                </div>
                <span className="text-sm font-medium">{activeUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-300" />
                  <span className="text-sm">Inactive Users</span>
                </div>
                <span className="text-sm font-medium">{inactiveUsers}</span>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-sm font-semibold">{totalUsers}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Analytics</CardTitle>
          <CardDescription>Document storage insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold">{totalDocuments}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Files</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold">{totalFolders}</p>
                <p className="text-xs text-muted-foreground mt-1">Folders</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold">10 GB</p>
                <p className="text-xs text-muted-foreground mt-1">Quota</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
