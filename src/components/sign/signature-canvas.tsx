'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createSignature, completeSignature, declineSignature } from '@/app/actions/sign'
import { CheckCircle2, XCircle, Loader2, Pencil, Type, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Document {
  id: string
  name: string
  blobUrl: string | null
}

interface SignatureField {
  id: string
  fieldType: string
  pageNumber: number
  positionX: number
  positionY: number
  width: number
  height: number
  isRequired: boolean
}

interface Signature {
  id: string
  fieldId: string
  signatureData: string
  signatureType: string
}

interface Participant {
  id: string
  fullName: string
  email: string
  role: string
}

interface SignatureCanvasProps {
  accessToken: string
  document: Document
  fields: SignatureField[]
  existingSignatures: Signature[]
  participant: Participant
}

export function SignatureCanvas({
  accessToken,
  document,
  fields,
  existingSignatures,
  participant,
}: SignatureCanvasProps) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatures, setSignatures] = useState<Signature[]>(existingSignatures)
  const [selectedField, setSelectedField] = useState<SignatureField | null>(null)
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw')
  const [typedSignature, setTypedSignature] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiredFields = fields.filter(f => f.isRequired)
  const completedFields = fields.filter(f =>
    signatures.some(s => s.fieldId === f.id)
  )

  useEffect(() => {
    if (isSignatureDialogOpen && signatureMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [isSignatureDialogOpen, signatureMode])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const handleSaveSignature = async () => {
    if (!selectedField) return

    setIsLoading(true)
    setError(null)

    let signatureData = ''

    if (signatureMode === 'draw') {
      const canvas = canvasRef.current
      if (!canvas) return
      signatureData = canvas.toDataURL('image/png')
    } else {
      if (!typedSignature.trim()) {
        setError('Please enter your signature')
        setIsLoading(false)
        return
      }
      signatureData = typedSignature
    }

    const result = await createSignature({
      accessToken,
      fieldId: selectedField.id,
      signatureData,
      signatureType: signatureMode === 'draw' ? 'drawn' : 'typed',
      ipAddress: window.location.hostname,
    })

    if (result.success && result.data) {
      setSignatures([...signatures, result.data])
      setIsSignatureDialogOpen(false)
      setSelectedField(null)
      setTypedSignature('')
      clearCanvas()
      router.refresh()
    } else {
      setError(result.error || 'Failed to save signature')
    }

    setIsLoading(false)
  }

  const handleComplete = async () => {
    setIsLoading(true)
    setError(null)

    const result = await completeSignature(accessToken)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to complete signature')
    }

    setIsLoading(false)
  }

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline signing this document?')) {
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await declineSignature(accessToken)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to decline signature')
    }

    setIsLoading(false)
  }

  const getFieldLabel = (fieldType: string) => {
    switch (fieldType) {
      case 'signature': return 'Signature'
      case 'initials': return 'Initials'
      case 'date': return 'Date'
      case 'text': return 'Text'
      case 'checkbox': return 'Checkbox'
      default: return 'Field'
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Signature Fields</CardTitle>
          <CardDescription>
            Complete {requiredFields.length} required field{requiredFields.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${requiredFields.length > 0 ? (completedFields.length / requiredFields.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium">
              {completedFields.length}/{requiredFields.length}
            </span>
          </div>

          {/* Fields List */}
          <div className="space-y-3">
            {fields.map((field, index) => {
              const isSigned = signatures.some(s => s.fieldId === field.id)
              const signature = signatures.find(s => s.fieldId === field.id)

              return (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">
                        {getFieldLabel(field.fieldType)}
                        {field.isRequired && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </p>
                      {isSigned && signature && (
                        <p className="text-xs text-muted-foreground">
                          Signed as {signature.signatureType}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSigned ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedField(field)
                          setIsSignatureDialogOpen(true)
                        }}
                        size="sm"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Sign
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Document Preview */}
          {document.blobUrl && (
            <div className="pt-4 border-t">
              <Button variant="outline" asChild className="w-full">
                <a href={document.blobUrl} target="_blank" rel="noopener noreferrer">
                  View Full Document
                </a>
              </Button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleComplete}
              disabled={isLoading || completedFields.length < requiredFields.length}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Signature
                </>
              )}
            </Button>
            <Button
              onClick={handleDecline}
              variant="destructive"
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Signature Dialog */}
      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedField && getFieldLabel(selectedField.fieldType)}
            </DialogTitle>
            <DialogDescription>
              Create your signature by drawing or typing
            </DialogDescription>
          </DialogHeader>

          <Tabs value={signatureMode} onValueChange={(v) => setSignatureMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw">
                <Pencil className="h-4 w-4 mr-2" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="type">
                <Type className="h-4 w-4 mr-2" />
                Type
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draw" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-4 bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full border rounded cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={clearCanvas}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </TabsContent>

            <TabsContent value="type" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typed-signature">Type your full name</Label>
                <Input
                  id="typed-signature"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder={participant.fullName}
                  className="text-2xl font-serif"
                />
              </div>
              {typedSignature && (
                <div className="p-8 border-2 rounded-lg bg-white">
                  <p className="text-4xl font-serif text-center">{typedSignature}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSignatureDialogOpen(false)
                setSelectedField(null)
                setTypedSignature('')
                clearCanvas()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSignature} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Signature'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
