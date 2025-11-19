import { getUsers } from '@/app/actions/users'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { UsersList } from '@/components/dashboard/users-list'
import Link from 'next/link'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'


export default async function UsersPage() {
  const result = await getUsers()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const usersList = result.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage users in your organization
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/users/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {usersList.length} {usersList.length === 1 ? 'user' : 'users'} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersList users={usersList} />
        </CardContent>
      </Card>
    </div>
  )
}
