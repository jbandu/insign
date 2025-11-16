'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createSignatureField, deleteSignatureField } from '@/app/actions/signature-fields'
import { Plus, Trash2, Pencil, User } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Participant {
  id: string
  email: string
  fullName: string
  role: string
}

interface Document {
  id: string
  name: string
  blobUrl: string | null
}

interface SignatureRequest {
  id: string
  title: string
  document: Document
  participants: Participant[]
}

interface SignatureField {
  id: string
  participantId: string
  fieldType: string
  pageNumber: number
  positionX: number
  positionY: number
  width: number
  height: number
  isRequired: boolean
  participant: Participant
}

interface SignatureFieldEditorProps {
  request: SignatureRequest
  existingFields: SignatureField[]
}

export function SignatureFieldEditor({ request, existingFields }: SignatureFieldEditorProps) {
  const router = useRouter()
  const [fields, setFields] = useState<SignatureField[]>(existingFields)
  const [selectedFieldType, setSelectedFieldType] = useState<string>('signature')
  const [selectedParticipant, setSelectedParticipant] = useState<string>(
    request.participants[0]?.id || ''
  )
  const [isPlacingField, setIsPlacingField] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fieldTypes = [
    { value: 'signature', label: 'Signature', color: 'bg-blue-500' },
    { value: 'initials', label: 'Initials', color: 'bg-green-500' },
    { value: 'date', label: 'Date', color: 'bg-yellow-500' },
    { value: 'text', label: 'Text', color: 'bg-purple-500' },
    { value: 'checkbox', label: 'Checkbox', color: 'bg-pink-500' },
  ]

  const getFieldColor = (fieldType: string) => {
    return fieldTypes.find(ft => ft.value === fieldType)?.color || 'bg-gray-500'
  }

  const getParticipantColor = (participantId: string) => {
    const index = request.participants.findIndex(p => p.id === participantId)
    const colors = ['border-blue-500', 'border-green-500', 'border-purple-500', 'border-orange-500', 'border-pink-500']
    return colors[index % colors.length]
  }

  const handlePlaceField = async (x: number, y: number) => {
    if (!selectedParticipant) {
      setError('Please select a participant')
      return
    }

    setIsPlacingField(true)
    setError(null)

    const result = await createSignatureField({
      requestId: request.id,
      participantId: selectedParticipant,
      fieldType: selectedFieldType as any,
      pageNumber: 1, // For now, always page 1
      positionX: x,
      positionY: y,
      width: selectedFieldType === 'checkbox' ? 30 : 150,
      height: selectedFieldType === 'checkbox' ? 30 : 50,
      isRequired: true,
    })

    if (result.success && result.data) {
      const participant = request.participants.find(p => p.id === selectedParticipant)!
      setFields([...fields, { ...result.data, participant }])
      router.refresh()
    } else {
      setError(result.error || 'Failed to place field')
    }

    setIsPlacingField(false)
  }

  const handleDeleteField = async (fieldId: string) => {
    const result = await deleteSignatureField(fieldId)

    if (result.success) {
      setFields(fields.filter(f => f.id !== fieldId))
      router.refresh()
    } else {
      setError(result.error || 'Failed to delete field')
    }
  }

  const handleDocumentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    handlePlaceField(x, y)
  }

  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      {/* Field Placement Controls */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Field Type</CardTitle>
            <CardDescription>Select the type of field to place</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {fieldTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedFieldType(type.value)}
                className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                  selectedFieldType === type.value
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-4 h-4 rounded ${type.color}`} />
                <span className="font-medium">{type.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign To</CardTitle>
            <CardDescription>Select the participant for this field</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
              <SelectTrigger>
                <SelectValue placeholder="Select participant" />
              </SelectTrigger>
              <SelectContent>
                {request.participants.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Select a field type above</p>
            <p>2. Select a participant</p>
            <p>3. Click on the document to place the field</p>
            <p>4. Click the trash icon to remove a field</p>
          </CardContent>
        </Card>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Document Preview Area */}
      <Card>
        <CardHeader>
          <CardTitle>Document Preview</CardTitle>
          <CardDescription>
            Click on the document to place {fieldTypes.find(ft => ft.value === selectedFieldType)?.label.toLowerCase()} fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="relative border-2 border-dashed rounded-lg bg-gray-50 min-h-[800px] cursor-crosshair"
            onClick={handleDocumentClick}
          >
            {/* Document placeholder - in production, render actual PDF here */}
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <Pencil className="h-12 w-12 mx-auto" />
                <p className="font-medium">{request.document.name}</p>
                <p className="text-sm">Click to place fields</p>
                {request.document.blobUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a href={request.document.blobUrl} target="_blank" rel="noopener noreferrer">
                      View Original Document
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Render existing fields */}
            {fields.map((field) => {
              const participant = request.participants.find(p => p.id === field.participantId)
              return (
                <div
                  key={field.id}
                  className={`absolute border-2 ${getParticipantColor(field.participantId)} ${getFieldColor(field.fieldType)} bg-opacity-20 rounded flex items-center justify-center group`}
                  style={{
                    left: field.positionX,
                    top: field.positionY,
                    width: field.width,
                    height: field.height,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1 text-xs font-medium px-2">
                    <User className="h-3 w-3" />
                    {fieldTypes.find(ft => ft.value === field.fieldType)?.label}
                  </div>
                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  {participant && (
                    <div className="absolute -top-6 left-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {participant.fullName}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Field Summary */}
          {fields.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Placed Fields ({fields.length})</h4>
              <div className="space-y-2">
                {request.participants.map((participant) => {
                  const participantFields = fields.filter(f => f.participantId === participant.id)
                  if (participantFields.length === 0) return null

                  return (
                    <div key={participant.id} className="flex items-center justify-between text-sm">
                      <span>{participant.fullName}</span>
                      <Badge variant="secondary">{participantFields.length} fields</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
