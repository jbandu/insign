'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { profileUpdateSchema, type ProfileUpdateInput } from '@/lib/validations/auth'
import { updateProfile } from '@/app/actions/profile'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProfileEditFormProps {
  initialData: {
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export function ProfileEditForm({ initialData }: ProfileEditFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: initialData.firstName || '',
      lastName: initialData.lastName || '',
    },
  })

  const onSubmit = async (data: ProfileUpdateInput) => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      const result = await updateProfile(data)

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          router.refresh()
        }, 3000)
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 flex items-center">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Profile updated successfully!
        </div>
      )}

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
          value={initialData.email}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed. Contact support if you need to update it.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isLoading || !isDirty}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Profile'
          )}
        </Button>
      </div>
    </form>
  )
}
