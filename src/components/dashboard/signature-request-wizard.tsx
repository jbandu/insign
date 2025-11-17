'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { signatureRequestSchema, type SignatureRequestInput } from '@/lib/validations/signatures'
import { createSignatureRequest, sendSignatureRequest } from '@/app/actions/signatures'
import { createSignatureField } from '@/app/actions/signature-fields'
import { convertDocumentToPDF } from '@/app/actions/documents-convert'
import { Loader2, ArrowLeft, ArrowRight, Plus, Trash2, Check, FileText, Users, Pencil, Send, User, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Document, Page, pdfjs } from 'react-pdf'

// Configure PDF.js worker - use local copy from public directory
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs'
}

interface Document {
  id: string
  name: string
  filePath: string
  mimeType?: string
}

interface SignatureRequestWizardProps {
  documents: Document[]
}

type WizardStep = 'details' | 'participants' | 'fields' | 'review'

interface PlacedField {
  id?: string
  participantIndex: number
  type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox'
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  label: string
}

export function SignatureRequestWizard({ documents }: SignatureRequestWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep>('details')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([])
  const [selectedFieldType, setSelectedFieldType] = useState<PlacedField['type']>('signature')
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState(0)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfWidth, setPdfWidth] = useState<number>(800)
  const [isConverting, setIsConverting] = useState(false)
  const [convertedDocId, setConvertedDocId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<SignatureRequestInput>({
    resolver: zodResolver(signatureRequestSchema),
    defaultValues: {
      workflowType: 'sequential',
      participants: [{ email: '', fullName: '', role: 'signer', orderIndex: 0 }],
    },
  })

  const { fields: participantFields, append, remove } = useFieldArray({
    control,
    name: 'participants',
  })

  const selectedDocumentId = watch('documentId')
  const selectedDocument = documents.find(d => d.id === selectedDocumentId)
  const participants = watch('participants')

  const steps: { id: WizardStep; label: string; icon: any }[] = [
    { id: 'details', label: 'Document Details', icon: FileText },
    { id: 'participants', label: 'Add Participants', icon: Users },
    { id: 'fields', label: 'Place Signature Fields', icon: Pencil },
    { id: 'review', label: 'Review & Send', icon: Send },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const fieldTypes = [
    { value: 'signature' as const, label: 'Signature', color: 'bg-blue-500', width: 200, height: 60 },
    { value: 'initials' as const, label: 'Initials', color: 'bg-green-500', width: 80, height: 40 },
    { value: 'date' as const, label: 'Date', color: 'bg-yellow-500', width: 120, height: 35 },
    { value: 'text' as const, label: 'Text', color: 'bg-purple-500', width: 150, height: 40 },
    { value: 'checkbox' as const, label: 'Checkbox', color: 'bg-pink-500', width: 30, height: 30 },
  ]

  const getParticipantColor = (index: number) => {
    const colors = ['border-blue-500', 'border-green-500', 'border-purple-500', 'border-orange-500', 'border-pink-500']
    return colors[index % colors.length]
  }

  const handleDocumentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const fieldConfig = fieldTypes.find(ft => ft.value === selectedFieldType)!

    const newField: PlacedField = {
      participantIndex: selectedParticipantIndex,
      type: selectedFieldType,
      pageNumber: currentPage,
      x,
      y,
      width: fieldConfig.width,
      height: fieldConfig.height,
      label: `${participants[selectedParticipantIndex]?.fullName || participants[selectedParticipantIndex]?.email} - ${fieldConfig.label}`,
    }

    setPlacedFields([...placedFields, newField])
  }

  const removeField = (index: number) => {
    setPlacedFields(placedFields.filter((_, i) => i !== index))
  }

  const handleConvertDocument = async () => {
    if (!selectedDocumentId) return

    setIsConverting(true)
    setError(null)

    try {
      const result = await convertDocumentToPDF(selectedDocumentId)

      if (!result.success) {
        setError(result.error || 'Failed to convert document')
        setIsConverting(false)
        return
      }

      // Update form to use the converted PDF
      if (result.documentId) {
        setConvertedDocId(result.documentId)
        // The form will automatically update via watch()
        setError(null)
      }
    } catch (err) {
      setError('An unexpected error occurred during conversion')
    } finally {
      setIsConverting(false)
    }
  }

  const handleNext = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent any default form submission behavior
    e?.preventDefault()
    e?.stopPropagation()

    if (currentStep === 'details') {
      if (!selectedDocumentId) {
        setError('Please select a document')
        return
      }

      // Check if document is convertible but not yet converted
      const isConvertible = selectedDocument?.mimeType &&
        ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/msword',
         'application/vnd.oasis.opendocument.text'].includes(selectedDocument.mimeType)

      if (isConvertible && !convertedDocId) {
        setError('Please convert this document to PDF before continuing')
        return
      }

      // Validate document is a PDF
      if (selectedDocument && selectedDocument.mimeType && selectedDocument.mimeType !== 'application/pdf') {
        setError('Only PDF documents are supported for signature requests.')
        return
      }

      setCurrentStep('participants')
    } else if (currentStep === 'participants') {
      if (participants.length === 0) {
        setError('Please add at least one participant')
        return
      }
      // Validate participants have emails
      const hasInvalidParticipants = participants.some(p => !p.email)
      if (hasInvalidParticipants) {
        setError('All participants must have an email address')
        return
      }
      setCurrentStep('fields')
    } else if (currentStep === 'fields') {
      // Validate that all participants have at least one signature field
      const participantsWithFields = new Set(placedFields.map(f => f.participantIndex))
      const missingParticipants = participants.filter((_, index) => !participantsWithFields.has(index))

      if (missingParticipants.length > 0) {
        setError(`Please add at least one signature field for: ${missingParticipants.map(p => p.fullName || p.email).join(', ')}`)
        return
      }

      // Navigate to review step - DO NOT submit yet
      setCurrentStep('review')
    }
    setError(null)
  }

  const handleBack = () => {
    const steps: WizardStep[] = ['details', 'participants', 'fields', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
    setError(null)
  }

  const onSubmit = async (data: SignatureRequestInput) => {
    try {
      setIsLoading(true)
      setError(null)

      // Step 1: Create signature request
      const requestResult = await createSignatureRequest(data)

      if (!requestResult.success || !requestResult.data) {
        setError(requestResult.error || 'Failed to create signature request')
        setIsLoading(false)
        return
      }

      const createdRequestId = requestResult.data.id
      setRequestId(createdRequestId)

      // Step 2: Create signature fields
      const participantIds = requestResult.data.participants?.map((p: any) => p.id) || []

      for (const field of placedFields) {
        const participantId = participantIds[field.participantIndex]

        if (!participantId) {
          console.error('Participant ID not found for index:', field.participantIndex)
          continue
        }

        await createSignatureField({
          requestId: createdRequestId,
          participantId,
          fieldType: field.type,
          pageNumber: field.pageNumber,
          positionX: field.x,
          positionY: field.y,
          width: field.width,
          height: field.height,
          isRequired: true,
        })
      }

      // Step 3: Send the signature request
      const sendResult = await sendSignatureRequest(createdRequestId)

      if (!sendResult.success) {
        setError(sendResult.error || 'Failed to send signature request')
        setIsLoading(false)
        return
      }

      // Success! Redirect to signature requests list
      router.push('/dashboard/signatures')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = index < currentStepIndex

                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                          isActive && 'border-primary bg-primary text-primary-foreground',
                          isCompleted && 'border-green-600 bg-green-600 text-white',
                          !isActive && !isCompleted && 'border-gray-300 text-gray-400'
                        )}
                      >
                        {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <p className={cn(
                        'text-xs mt-2 text-center max-w-[100px]',
                        isActive && 'font-semibold text-primary',
                        !isActive && 'text-muted-foreground'
                      )}>
                        {step.label}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        'w-24 h-0.5 mx-2 mb-6',
                        index < currentStepIndex ? 'bg-green-600' : 'bg-gray-300'
                      )} />
                    )}
                  </div>
                )
              })}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step Content */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Document Details */}
        {currentStep === 'details' && (
          <Card>
            <CardHeader>
              <CardTitle>Select Document & Add Details</CardTitle>
              <CardDescription>Choose the document you want to send for signature</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documentId">Select Document *</Label>
                <select
                  id="documentId"
                  {...register('documentId')}
                  disabled={isLoading || isConverting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(e) => {
                    // Reset converted doc ID when selection changes
                    setConvertedDocId(null)
                  }}
                >
                  <option value="">Choose a document...</option>
                  {documents.map((doc) => {
                    const isPDF = doc.mimeType === 'application/pdf'
                    const isConvertible = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                          'application/msword',
                                          'application/vnd.oasis.opendocument.text'].includes(doc.mimeType || '')
                    return (
                      <option
                        key={doc.id}
                        value={doc.id}
                      >
                        {doc.name} {isPDF ? '(PDF)' : isConvertible ? '(Word - convertible)' : '(Not supported)'}
                      </option>
                    )
                  })}
                </select>
                {errors.documentId && (
                  <p className="text-sm text-destructive">{errors.documentId.message}</p>
                )}

                {/* Show convert button for Word documents */}
                {selectedDocument && selectedDocument.mimeType &&
                  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                   'application/msword',
                   'application/vnd.oasis.opendocument.text'].includes(selectedDocument.mimeType) &&
                  !convertedDocId && (
                    <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Word Document Selected
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            This document needs to be converted to PDF before you can send it for signatures.
                          </p>
                          <Button
                            type="button"
                            onClick={handleConvertDocument}
                            disabled={isConverting}
                            size="sm"
                            className="mt-3"
                          >
                            {isConverting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Converting...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Convert to PDF
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Show success message after conversion */}
                {convertedDocId && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <p className="text-sm text-green-900 dark:text-green-100">
                        Document converted to PDF successfully
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Request Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Employment Agreement Signature"
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
                  placeholder="Please review and sign this document at your earliest convenience."
                  disabled={isLoading}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workflowType">Signing Order *</Label>
                <select
                  id="workflowType"
                  {...register('workflowType')}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="sequential">Sequential (one at a time in order)</option>
                  <option value="parallel">Parallel (all can sign at once)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Sequential: Participants sign in order. Parallel: All can sign simultaneously.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Add Participants */}
        {currentStep === 'participants' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Add Participants</CardTitle>
                  <CardDescription>Who needs to sign this document?</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ email: '', fullName: '', role: 'signer', orderIndex: participantFields.length })}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Participant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {participantFields.map((field, index) => (
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
                          Email *
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
                          <option value="cc">CC (Carbon Copy)</option>
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

                  {participantFields.length > 1 && (
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
        )}

        {/* Step 3: Place Signature Fields */}
        {currentStep === 'fields' && (
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            {/* Field Controls */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Field Type</CardTitle>
                  <CardDescription>Select field type to place</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {fieldTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedFieldType(type.value)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 border-2 rounded-lg transition-all',
                        selectedFieldType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className={cn('w-4 h-4 rounded', type.color)} />
                      <span className="font-medium">{type.label}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assign To</CardTitle>
                  <CardDescription>Select participant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {participants.map((participant, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedParticipantIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 border-2 rounded-lg transition-all text-left',
                        selectedParticipantIndex === index
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <User className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{participant.fullName || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground truncate">{participant.email}</p>
                      </div>
                      <Badge variant="outline">
                        {placedFields.filter(f => f.participantIndex === index).length}
                      </Badge>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Instructions</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>1. Select a field type</p>
                  <p>2. Select a participant</p>
                  <p>3. Click on the document to place</p>
                  <p>4. Click × to remove a field</p>
                </CardContent>
              </Card>
            </div>

            {/* Document Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
                <CardDescription>
                  Click to place {fieldTypes.find(ft => ft.value === selectedFieldType)?.label.toLowerCase()} for{' '}
                  {participants[selectedParticipantIndex]?.fullName || participants[selectedParticipantIndex]?.email}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* PDF Renderer */}
                  {selectedDocument?.filePath ? (
                    <Document
                      file={{ url: selectedDocument.filePath }}
                      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                      onLoadError={(error) => {
                        console.error('PDF load error:', error)
                        const errorMsg = selectedDocument?.mimeType !== 'application/pdf'
                          ? 'This document is not a PDF file. Only PDF documents are supported for signature requests.'
                          : `Failed to load PDF: ${error.message}`
                        setError(errorMsg)
                      }}
                      loading={
                        <div className="flex items-center justify-center min-h-[800px] border-2 border-dashed rounded-lg bg-gray-50">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Loading PDF...</p>
                          </div>
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center min-h-[800px] border-2 border-dashed rounded-lg bg-red-50">
                          <div className="text-center text-red-600">
                            <FileText className="h-12 w-12 mx-auto mb-2" />
                            <p className="font-semibold">Failed to load PDF</p>
                            <p className="text-sm mt-1">Please check the document file</p>
                            {error && <p className="text-xs mt-2 max-w-md">{error}</p>}
                          </div>
                        </div>
                      }
                      options={{
                        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                        cMapPacked: true,
                        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
                      }}
                    >
                      <div
                        className="relative cursor-crosshair inline-block"
                        onClick={handleDocumentClick}
                      >
                        <Page
                          key={`page-${currentPage}`}
                          pageNumber={currentPage}
                          width={pdfWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onLoadError={(error) => {
                            console.error('Page load error:', error)
                          }}
                        />

                        {/* Render Placed Fields (only for current page) */}
                  {placedFields.filter(f => f.pageNumber === currentPage).map((field, index) => {
                    const fieldType = fieldTypes.find(ft => ft.value === field.type)!
                    const actualIndex = placedFields.indexOf(field)
                    return (
                      <div
                        key={index}
                        className={cn(
                          'absolute border-2 rounded flex items-center justify-center group',
                          getParticipantColor(field.participantIndex),
                          fieldType.color,
                          'bg-opacity-20'
                        )}
                        style={{
                          left: field.x,
                          top: field.y,
                          width: field.width,
                          height: field.height,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-xs font-medium px-2 text-center truncate">
                          {fieldType.label}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeField(actualIndex)}
                          className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <div className="absolute -top-6 left-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {participants[field.participantIndex]?.fullName || participants[field.participantIndex]?.email}
                        </div>
                      </div>
                    )
                  })}
                      </div>
                    </Document>
                  ) : (
                    <div className="flex items-center justify-center min-h-[800px] border-2 border-dashed rounded-lg bg-gray-50">
                      <div className="text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2" />
                        <p className="font-medium">No document selected</p>
                        <p className="text-sm">Select a document in step 1 to view it here</p>
                      </div>
                    </div>
                  )}

                  {/* Page Navigation */}
                  {selectedDocument?.filePath && numPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-4 p-3 bg-gray-50 rounded-lg">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">
                        Page {currentPage} of {numPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                        disabled={currentPage >= numPages}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Field Summary */}
                {placedFields.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Placed Fields ({placedFields.length})</h4>
                    <div className="space-y-2">
                      {participants.map((participant, index) => {
                        const participantFieldCount = placedFields.filter(f => f.participantIndex === index).length
                        if (participantFieldCount === 0) return null

                        return (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{participant.fullName || participant.email}</span>
                            <Badge variant="secondary">{participantFieldCount} fields</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Review & Send */}
        {currentStep === 'review' && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Send</CardTitle>
              <CardDescription>Review your signature request before sending</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Details */}
              <div>
                <h3 className="font-semibold mb-2">Document</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedDocument?.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{watch('title')}</p>
                  {watch('message') && (
                    <p className="text-sm text-muted-foreground mt-2 italic">"{watch('message')}"</p>
                  )}
                </div>
              </div>

              {/* Participants */}
              <div>
                <h3 className="font-semibold mb-2">Participants ({participants.length})</h3>
                <div className="space-y-2">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{participant.fullName || 'Unnamed'}</p>
                        <p className="text-sm text-muted-foreground">{participant.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{participant.role}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {placedFields.filter(f => f.participantIndex === index).length} fields
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflow */}
              <div>
                <h3 className="font-semibold mb-2">Workflow</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Badge>{watch('workflowType') === 'sequential' ? 'Sequential' : 'Parallel'}</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    {watch('workflowType') === 'sequential'
                      ? 'Participants will sign one at a time in the specified order.'
                      : 'All participants can sign simultaneously.'}
                  </p>
                </div>
              </div>

              {/* Total Fields */}
              <div>
                <h3 className="font-semibold mb-2">Signature Fields</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">Total: {placedFields.length} fields</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fieldTypes.map(type => {
                      const count = placedFields.filter(f => f.type === type.value).length
                      if (count === 0) return null
                      return (
                        <Badge key={type.value} variant="secondary">
                          {type.label}: {count}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {currentStep !== 'details' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}

          {currentStep !== 'review' ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Signature Request
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/dashboard/signatures')}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
