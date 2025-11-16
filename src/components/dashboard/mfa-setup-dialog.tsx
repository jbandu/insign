'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getMfaMethods,
  setupMfaMethod,
  verifyAndEnableMfa,
  disableMfaMethod,
  getBackupCodes,
  regenerateBackupCodes,
} from '@/app/actions/mfa'
import { Shield, Key, Copy, RefreshCw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MfaMethod {
  id: string
  type: string
  enabled: boolean
  verifiedAt: Date | null
  createdAt: Date | null
}

interface MfaSetupResponse {
  methodId: string
  secret: string
  qrCode: string
  backupCodes: string[]
  otpauthUrl: string
}

export function MfaSetupDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [methods, setMethods] = useState<MfaMethod[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      loadMethods()
    }
  }, [open])

  const loadMethods = async () => {
    setIsLoading(true)
    setError(null)
    const result = await getMfaMethods()
    if (result.success && result.data) {
      setMethods(result.data as MfaMethod[])
    } else {
      setError(result.error || 'Failed to load MFA methods')
    }
    setIsLoading(false)
  }

  const handleSetup = async () => {
    setIsLoading(true)
    setError(null)
    const result = await setupMfaMethod({ type: 'totp' })

    if (result.success && result.data) {
      setSetupData(result.data as MfaSetupResponse)
    } else {
      setError(result.error || 'Failed to setup MFA')
    }
    setIsLoading(false)
  }

  const handleVerify = async () => {
    if (!setupData || !verificationCode.trim()) {
      setError('Please enter the verification code')
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await verifyAndEnableMfa({
      code: verificationCode,
      methodId: setupData.methodId,
    })

    if (result.success) {
      setSetupData(null)
      setVerificationCode('')
      loadMethods()
    } else {
      setError(result.error || 'Failed to verify code')
    }
    setIsLoading(false)
  }

  const handleDisable = async (methodId: string) => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await disableMfaMethod(methodId)

    if (result.success) {
      loadMethods()
    } else {
      setError(result.error || 'Failed to disable MFA')
    }
    setIsLoading(false)
  }

  const handleShowBackupCodes = async (methodId: string) => {
    setIsLoading(true)
    setError(null)
    const result = await getBackupCodes(methodId)

    if (result.success && result.data) {
      setBackupCodes(result.data.backupCodes as string[])
      setShowBackupCodes(true)
    } else {
      setError(result.error || 'Failed to get backup codes')
    }
    setIsLoading(false)
  }

  const handleRegenerateBackupCodes = async (methodId: string) => {
    if (!confirm('Are you sure you want to regenerate backup codes? Your old codes will no longer work.')) {
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await regenerateBackupCodes(methodId)

    if (result.success && result.data) {
      setBackupCodes(result.data.backupCodes as string[])
      setShowBackupCodes(true)
    } else {
      setError(result.error || 'Failed to regenerate backup codes')
    }
    setIsLoading(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const copyAllBackupCodes = () => {
    const text = backupCodes.join('\n')
    navigator.clipboard.writeText(text)
  }

  const enabledMethod = methods.find((m) => m.enabled)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Multi-Factor Authentication
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Multi-Factor Authentication (MFA)</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* MFA Status */}
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">MFA Status</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {enabledMethod
                    ? 'Multi-factor authentication is enabled'
                    : 'Multi-factor authentication is not enabled'}
                </p>
              </div>
              <Badge variant={enabledMethod ? 'default' : 'secondary'}>
                {enabledMethod ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>

          {/* Setup Flow */}
          {!setupData && !enabledMethod && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Enable MFA</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add an extra layer of security to your account by requiring a verification code in
                  addition to your password.
                </p>
                <Button onClick={handleSetup} disabled={isLoading}>
                  <Shield className="h-4 w-4 mr-2" />
                  Set Up MFA
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">What you'll need:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>An authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
                  <li>Your smartphone or tablet</li>
                  <li>A few minutes to complete the setup</li>
                </ul>
              </div>
            </div>
          )}

          {/* QR Code Setup */}
          {setupData && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-sm font-medium mb-4">Scan QR Code</h3>
                <div className="inline-block p-4 bg-white rounded-lg">
                  <img src={setupData.qrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <Label className="text-xs">Manual Entry Code</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                    {setupData.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(setupData.secret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  If you can't scan the QR code, enter this code manually in your app
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to verify
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleVerify} disabled={isLoading || verificationCode.length !== 6}>
                  Verify and Enable
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSetupData(null)
                    setVerificationCode('')
                  }}
                >
                  Cancel
                </Button>
              </div>

              {/* Backup Codes Display */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Backup Codes</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Save these backup codes in a safe place. Each code can be used once if you lose access
                  to your authenticator app.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {setupData.backupCodes.map((code, index) => (
                    <code
                      key={index}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={copyAllBackupCodes}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Codes
                </Button>
              </div>
            </div>
          )}

          {/* Enabled MFA Management */}
          {enabledMethod && !setupData && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="h-4 w-4" />
                      <span className="font-medium">Authenticator App (TOTP)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enabled on{' '}
                      {enabledMethod.verifiedAt
                        ? new Date(enabledMethod.verifiedAt).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisable(enabledMethod.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Disable
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShowBackupCodes(enabledMethod.id)}
                    disabled={isLoading}
                  >
                    View Backup Codes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateBackupCodes(enabledMethod.id)}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Backup Codes
                  </Button>
                </div>
              </div>

              {/* Backup Codes Display */}
              {showBackupCodes && backupCodes.length > 0 && (
                <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
                  <h4 className="text-sm font-medium mb-2">Your Backup Codes</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {backupCodes.length} backup codes remaining. Each can be used once.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {backupCodes.map((code, index) => (
                      <code
                        key={index}
                        className="px-3 py-2 bg-white dark:bg-gray-800 rounded text-sm font-mono text-center"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={copyAllBackupCodes}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Codes
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Info Section */}
          <div className="border-t pt-4">
            <h4 className="text-xs font-medium mb-2">About MFA:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Adds an extra layer of security beyond your password</li>
              <li>Works with any TOTP-compatible authenticator app</li>
              <li>Backup codes can be used if you lose access to your authenticator</li>
              <li>You'll be asked for a code each time you sign in</li>
              <li>
                Note: TOTP verification requires installation of 'speakeasy' and 'qrcode' npm packages
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
