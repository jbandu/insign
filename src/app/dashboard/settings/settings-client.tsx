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
import type { Locale } from '@/lib/i18n-config'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
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
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        {/* Organization Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('organization.title')}</CardTitle>
            <CardDescription>
              {t('organization.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('organization.name')}</Label>
                <Input value={organization?.name || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>{t('organization.domain')}</Label>
                <Input value={organization?.domain || ''} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('organization.subscriptionTier')}</Label>
              <Input
                value={organization?.subscriptionTier || 'trial'}
                disabled
                className="capitalize"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('organization.status')}</Label>
              <Input
                value={organization?.status || 'active'}
                disabled
                className="capitalize"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button disabled>{t('organization.update')}</Button>
              <p className="text-xs text-muted-foreground self-center">
                {t('organization.contactSupport')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.title')}</CardTitle>
            <CardDescription>{t('profile.subtitle')}</CardDescription>
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
            <CardTitle>{t('security.title')}</CardTitle>
            <CardDescription>{t('security.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('security.password')}</Label>
              <div className="flex items-center gap-3">
                <Input type="password" value="••••••••••••" disabled className="max-w-xs" />
                <Button onClick={() => setPasswordDialogOpen(true)}>
                  {t('security.changePassword')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('security.lastChanged', { date: 'Never (or date not available)' })}
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>{t('security.twoFactor')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('security.twoFactorDesc')}
              </p>
              <Button variant="outline" disabled>
                {t('security.enable2FA')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('security.requires2FASetup')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader>
            <CardTitle>{t('storage.title')}</CardTitle>
            <CardDescription>{t('storage.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('storage.used')}</span>
                <span className="font-medium">0 MB / 10 GB</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-primary" style={{ width: '0%' }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('storage.remaining', { amount: '10 GB' })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Language Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>{t('language.title')}</CardTitle>
            <CardDescription>
              {t('language.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">{t('language.select')}</Label>
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
              <CardTitle className="text-destructive">{t('danger.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('danger.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-1">{t('danger.deleteData.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('danger.deleteData.description')}
                    <strong className="block mt-1 text-destructive">
                      {t('danger.deleteData.warning')}
                    </strong>
                  </p>
                </div>

                {deleteSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800 font-medium">
                      {t('danger.deleteData.success')}
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
                      {t('danger.deleteData.deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('danger.deleteData.button')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>{t('danger.deleteData.whatDeleted')}</strong></p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>{t('danger.deleteData.items.documents')}</li>
                <li>{t('danger.deleteData.items.signatures')}</li>
                <li>{t('danger.deleteData.items.templates')}</li>
                <li>{t('danger.deleteData.items.folders')}</li>
                <li>{t('danger.deleteData.items.apiKeys')}</li>
                <li>{t('danger.deleteData.items.auditLogs')}</li>
              </ul>
              <p className="mt-2"><strong>{t('danger.deleteData.whatPreserved')}</strong></p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>{t('danger.deleteData.items.users')}</li>
                <li>{t('danger.deleteData.items.organizations')}</li>
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
              {t('danger.deleteData.confirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {t('danger.deleteData.confirmDescription')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                <li>{t('danger.deleteData.items.documents')}</li>
                <li>{t('danger.deleteData.items.signatures')}</li>
                <li>{t('danger.deleteData.items.templates')}</li>
                <li>{t('danger.deleteData.items.folders')}</li>
                <li>{t('danger.deleteData.items.apiKeys')}</li>
                <li>{t('danger.deleteData.items.auditLogs')}</li>
              </ul>
              <p className="font-semibold">
                {t('danger.deleteData.whatPreserved')}: {t('danger.deleteData.items.users')}, {t('danger.deleteData.items.organizations')}
              </p>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mt-3">
                <p className="text-sm text-yellow-800">
                  {t('danger.deleteData.confirmWarning')}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllData}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('danger.deleteData.deleting')}
                </>
              ) : (
                t('danger.deleteData.confirmButton')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
