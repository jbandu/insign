'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'
import { signup, checkDomainAvailability } from '@/app/actions/auth'
import { Loader2, Check, X } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [domainStatus, setDomainStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  const organizationDomain = watch('organizationDomain')
  const password = watch('password')

  // Check domain availability on blur
  const handleDomainCheck = async () => {
    if (!organizationDomain || organizationDomain.length < 3) return

    setDomainStatus('checking')
    const result = await checkDomainAvailability(organizationDomain)
    setDomainStatus(result.available ? 'available' : 'unavailable')
  }

  const onSubmit = async (data: SignupInput) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await signup(data)

      if (result.success) {
        // Redirect to login with success message
        router.push('/auth/signin?registered=true')
      } else {
        setError(result.error || 'Failed to create account')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            Create Your Insign Account
          </CardTitle>
          <CardDescription>
            Set up your organization and start managing operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Organization Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Organization Details</h3>

              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  {...register('organizationName')}
                  placeholder="Acme Corporation"
                  disabled={isLoading}
                />
                {errors.organizationName && (
                  <p className="text-sm text-destructive">{errors.organizationName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationDomain">Organization Domain</Label>
                <div className="relative">
                  <Input
                    id="organizationDomain"
                    {...register('organizationDomain')}
                    placeholder="acme"
                    disabled={isLoading}
                    onBlur={handleDomainCheck}
                    className="pr-10"
                  />
                  {domainStatus === 'checking' && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {domainStatus === 'available' && (
                    <Check className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                  )}
                  {domainStatus === 'unavailable' && (
                    <X className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters, numbers, and hyphens
                </p>
                {errors.organizationDomain && (
                  <p className="text-sm text-destructive">{errors.organizationDomain.message}</p>
                )}
                {domainStatus === 'unavailable' && (
                  <p className="text-sm text-destructive">This domain is already taken</p>
                )}
              </div>
            </div>

            {/* Admin User Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Details (Admin Account)</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...register('firstName')}
                    placeholder="John"
                    disabled={isLoading}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...register('lastName')}
                    placeholder="Doe"
                    disabled={isLoading}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="john@acme.com"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  {...register('password')}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
                <PasswordStrengthIndicator password={password || ''} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="agreeToTerms"
                {...register('agreeToTerms')}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="agreeToTerms" className="text-sm font-normal">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-destructive">{errors.agreeToTerms.message}</p>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            {/* Sign In Link */}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
