'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ProfileEditForm } from '@/components/dashboard/profile-edit-form'
import { PasswordChangeDialog } from '@/components/dashboard/password-change-dialog'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { deleteAllDataExceptUsers } from '@/app/actions/admin'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRouter } from 'next/navigation'
import { LanguageSelector } from '@/components/i18n/language-selector'
import type { Locale } from '@/i18n'

interface SettingsClientProps {
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    language: string | null
  }
  organization: {
    name: string
    domain: string
    subscriptionTier: string
    status: string
  }
}

export function SettingsClient({ user, organization }: SettingsClientProps) {
  const router = useRouter()
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)

  const handleDeleteAllData = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    setDeleteSuccess(false)

    try {
      const result = await deleteAllDataExceptUsers()

      if (result.success) {
        setDeleteSuccess(true)
        setDeleteDialogOpen(false)
        // Refresh the page after a short delay
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        setDeleteError(result.error || 'Failed to delete data')
      }
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

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

        {/* Language Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Language Preferences</CardTitle>
            <CardDescription>
              Choose your preferred language for the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <LanguageSelector
                currentLanguage={(user.language as Locale) || 'en'}
                isAuthenticated={true}
                variant="select"
              />
              <p className="text-xs text-muted-foreground">
                The interface will be displayed in your selected language
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Delete All Data (Except Users)</h4>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete all documents, signatures, templates, and other data from your organization.
                    <strong className="block mt-1 text-destructive">
                      Users and organizations will be preserved, but all other data will be lost forever.
                    </strong>
                  </p>
                </div>

                {deleteSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ All data deleted successfully! Page will refresh shortly...
                    </p>
                  </div>
                )}

                {deleteError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive font-medium">
                      Error: {deleteError}
                    </p>
                  </div>
                )}

                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Data
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>What will be deleted:</strong></p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>All documents and document versions</li>
                <li>All signature requests and signatures</li>
                <li>All templates and fields</li>
                <li>All folders and tags</li>
                <li>All API keys and webhooks</li>
                <li>All audit logs and sessions</li>
              </ul>
              <p className="mt-2"><strong>What will be preserved:</strong></p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Users and their profiles</li>
                <li>Organizations and settings</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <PasswordChangeDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action <strong className="text-destructive">cannot be undone</strong>. This will permanently delete:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                <li>All documents, signatures, and templates</li>
                <li>All folders, tags, and permissions</li>
                <li>All API keys, webhooks, and audit logs</li>
                <li>All sessions and authentication data</li>
              </ul>
              <p className="font-semibold">
                Only user accounts and organization settings will be preserved.
              </p>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mt-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Warning:</strong> Make sure you have backups before proceeding!
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllData}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete All Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
