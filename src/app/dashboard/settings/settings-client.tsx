'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ProfileEditForm } from '@/components/dashboard/profile-edit-form'
import { PasswordChangeDialog } from '@/components/dashboard/password-change-dialog'

interface SettingsClientProps {
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  organization: {
    name: string
    domain: string
    subscriptionTier: string
    status: string
  }
}

export function SettingsClient({ user, organization }: SettingsClientProps) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  return (
    <>
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
              <p className="text-xs text-muted-foreground self-center">
                Contact support to update organization settings
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Manage your personal account details</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileEditForm
              initialData={{
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
              }}
            />
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="flex items-center gap-3">
                <Input type="password" value="••••••••••••" disabled className="max-w-xs" />
                <Button onClick={() => setPasswordDialogOpen(true)}>
                  Change Password
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Last changed: Never (or date not available)
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
              <Button variant="outline" disabled>
                Enable 2FA
              </Button>
              <p className="text-xs text-muted-foreground">
                2FA setup requires additional configuration
              </p>
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

      <PasswordChangeDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </>
  )
}
