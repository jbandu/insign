import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function SettingsPage() {
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

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, currentUser.orgId),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your organization and account settings
        </p>
      </div>

      {/* Organization Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>
            Manage your organization details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={organization?.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input value={organization?.domain || ''} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subscription Tier</Label>
            <Input
              value={organization?.subscriptionTier || 'trial'}
              disabled
              className="capitalize"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Input
              value={organization?.status || 'active'}
              disabled
              className="capitalize"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button disabled>Update Organization</Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Manage your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={currentUser.firstName || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={currentUser.lastName || ''} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={currentUser.email} disabled />
          </div>

          <div className="flex gap-3 pt-2">
            <Button disabled>Update Profile</Button>
            <Button variant="outline" disabled>
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>View your organization's storage usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used</span>
              <span className="font-medium">0 MB / 10 GB</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-primary" style={{ width: '0%' }} />
            </div>
            <p className="text-xs text-muted-foreground">
              10 GB remaining
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
