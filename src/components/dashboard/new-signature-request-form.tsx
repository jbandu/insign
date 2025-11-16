'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signatureRequestSchema, type SignatureRequestInput } from '@/lib/validations/signatures'
import { createSignatureRequest } from '@/app/actions/signatures'
import { Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Document {
  id: string
  name: string
}

interface NewSignatureRequestPageProps {
  documents: Document[]
}

export function NewSignatureRequestForm({ documents }: NewSignatureRequestPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignatureRequestInput>({
    resolver: zodResolver(signatureRequestSchema),
    defaultValues: {
      workflowType: 'sequential',
      participants: [{ email: '', fullName: '', role: 'signer', orderIndex: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'participants',
  })

  const onSubmit = async (data: SignatureRequestInput) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await createSignatureRequest(data)

      if (result.success) {
        router.push('/dashboard/signatures')
        router.refresh()
      } else {
        setError(result.error || 'Failed to create signature request')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>
            Configure the signature request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentId">Select Document</Label>
            <select
              id="documentId"
              {...register('documentId')}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Choose a document...</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
            {errors.documentId && (
              <p className="text-sm text-destructive">{errors.documentId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Request Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Contract Signature Request"
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <textarea
              id="message"
              {...register('message')}
              placeholder="Please review and sign this document"
              disabled={isLoading}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workflowType">Workflow Type</Label>
            <select
              id="workflowType"
              {...register('workflowType')}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="sequential">Sequential (one at a time)</option>
              <option value="parallel">Parallel (all at once)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Participants</CardTitle>
              <CardDescription>
                Add people who need to sign this document
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ email: '', fullName: '', role: 'signer', orderIndex: fields.length })}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Participant
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start p-4 border rounded-lg">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.fullName`}>
                      Full Name
                    </Label>
                    <Input
                      {...register(`participants.${index}.fullName`)}
                      placeholder="John Doe"
                      disabled={isLoading}
                    />
                    {errors.participants?.[index]?.fullName && (
                      <p className="text-sm text-destructive">
                        {errors.participants[index]?.fullName?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.email`}>
                      Email
                    </Label>
                    <Input
                      type="email"
                      {...register(`participants.${index}.email`)}
                      placeholder="john@example.com"
                      disabled={isLoading}
                    />
                    {errors.participants?.[index]?.email && (
                      <p className="text-sm text-destructive">
                        {errors.participants[index]?.email?.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.role`}>
                      Role
                    </Label>
                    <select
                      {...register(`participants.${index}.role`)}
                      disabled={isLoading}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="signer">Signer</option>
                      <option value="approver">Approver</option>
                      <option value="cc">CC</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.orderIndex`}>
                      Order
                    </Label>
                    <Input
                      type="number"
                      {...register(`participants.${index}.orderIndex`, {
                        valueAsNumber: true,
                      })}
                      min="0"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}

          {errors.participants && (
            <p className="text-sm text-destructive">
              {errors.participants.message}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Request'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/signatures')}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
