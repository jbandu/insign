import { getRoles } from '@/app/actions/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield } from 'lucide-react'
import { RolesList } from '@/components/dashboard/roles-list'
import Link from 'next/link'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'


export default async function RolesPage() {
  const result = await getRoles()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Roles</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const rolesList = result.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Roles & Permissions</h2>
          <p className="text-muted-foreground">
            Manage roles and access control for your organization
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/roles/new">
            <Shield className="mr-2 h-4 w-4" />
            New Role
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Roles</CardTitle>
          <CardDescription>
            {rolesList.length} {rolesList.length === 1 ? 'role' : 'roles'} defined
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RolesList roles={rolesList} />
        </CardContent>
      </Card>
    </div>
  )
}
