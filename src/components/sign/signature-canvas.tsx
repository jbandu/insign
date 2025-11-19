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
import { CheckCircle2, XCircle, Loader2, Pencil, Type, Trash2, FileText, ArrowLeft, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Document, Page } from 'react-pdf'
import { cn } from '@/lib/utils'
import '@/lib/pdf-config' // Import centralized PDF configuration

interface Document {
  id: string
  name: string
  filePath: string
}

interface SignatureField {
  id: string
  type: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  required: boolean | null
}

interface Signature {
  id: string
  fieldId: string
  signatureData: string
  signatureType: string
}

interface Participant {
  id: string
  fullName: string | null
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
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [reusableSignature, setReusableSignature] = useState<{
    data: string
    type: 'draw' | 'type'
  } | null>(null)
  const [pdfWidth, setPdfWidth] = useState(800)

  const requiredFields = fields.filter(f => f.required)
  const completedFields = fields.filter(f =>
    signatures.some(s => s.fieldId === f.id)
  )

  // Set responsive PDF width based on screen size
  useEffect(() => {
    const updatePdfWidth = () => {
      const width = window.innerWidth
      if (width < 640) { // mobile
        setPdfWidth(width - 40) // Account for padding
      } else if (width < 1024) { // tablet
        setPdfWidth(600)
      } else { // desktop
        setPdfWidth(800)
      }
    }

    updatePdfWidth()
    window.addEventListener('resize', updatePdfWidth)
    return () => window.removeEventListener('resize', updatePdfWidth)
  }, [])

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

  // Helper function to get scaled coordinates
  const getScaledCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getScaledCoordinates(e.clientX, e.clientY)

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

    const { x, y } = getScaledCoordinates(e.clientX, e.clientY)

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // Touch event handlers for mobile devices
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent scrolling while drawing
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const touch = e.touches[0]
    const { x, y } = getScaledCoordinates(touch.clientX, touch.clientY)

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent scrolling while drawing
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const touch = e.touches[0]
    const { x, y } = getScaledCoordinates(touch.clientX, touch.clientY)

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
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
      if (!canvas) {
        setError('Canvas not available')
        setIsLoading(false)
        return
      }
      signatureData = canvas.toDataURL('image/png')

      // Check if canvas is empty
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const isCanvasEmpty = imageData.data.every(pixel => pixel === 0)
        if (isCanvasEmpty) {
          setError('Please draw your signature')
          setIsLoading(false)
          return
        }
      }
    } else {
      if (!typedSignature.trim()) {
        setError('Please enter your signature')
        setIsLoading(false)
        return
      }
      signatureData = typedSignature.trim()
    }

    const result = await createSignature({
      accessToken,
      fieldId: selectedField.id,
      signatureData,
      signatureType: signatureMode === 'draw' ? 'drawn' : 'typed',
      // ipAddress is optional and will default to '0.0.0.0' on server
      // We can't reliably get client IP from browser due to proxies/CDN
    })

    if (result.success && result.data) {
      setSignatures([...signatures, result.data])

      // Store signature for reuse if this is the first signature
      if (!reusableSignature) {
        setReusableSignature({
          data: signatureData,
          type: signatureMode,
        })
      }

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

  const handleApplyPreviousSignature = async () => {
    if (!selectedField || !reusableSignature) return

    setIsLoading(true)
    setError(null)

    const result = await createSignature({
      accessToken,
      fieldId: selectedField.id,
      signatureData: reusableSignature.data,
      signatureType: reusableSignature.type === 'draw' ? 'drawn' : 'typed',
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
      // Redirect to success page instead of refreshing
      // because the access token becomes inactive after completion
      router.push('/sign/completed')
    } else {
      setError(result.error || 'Failed to complete signature')
      setIsLoading(false)
    }
  }

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline signing this document?')) {
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await declineSignature(accessToken)

    if (result.success) {
      // Redirect to a declined confirmation page instead of refreshing
      // which would cause "no longer active" error
      router.push('/sign/declined')
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
      {/* Progress Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{
                  width: `${requiredFields.length > 0 ? (completedFields.length / requiredFields.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-sm sm:text-base font-medium whitespace-nowrap">
              {completedFields.length}/{requiredFields.length} Signed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Document with Signature Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Document & Signature Fields</CardTitle>
          <CardDescription className="text-sm">
            Tap on the highlighted fields to add your signature
          </CardDescription>
        </CardHeader>
        <CardContent>
          {document.filePath ? (
            <div className="space-y-4">
              <Document
                file={{ url: document.filePath }}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                onLoadError={(error) => {
                  console.error('PDF load error:', error)
                  setError('Failed to load document')
                }}
                loading={
                  <div className="flex items-center justify-center min-h-[600px] border-2 border-dashed rounded-lg bg-gray-50">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading document...</p>
                    </div>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center min-h-[600px] border-2 border-dashed rounded-lg bg-red-50">
                    <div className="text-center text-red-600">
                      <FileText className="h-12 w-12 mx-auto mb-2" />
                      <p className="font-semibold">Failed to load document</p>
                      <p className="text-sm mt-1">Please try refreshing the page</p>
                    </div>
                  </div>
                }
                options={{
                  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                  cMapPacked: true,
                  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
                }}
              >
                <div className="relative inline-block">
                  <Page
                    key={`page-${currentPage}`}
                    pageNumber={currentPage}
                    width={pdfWidth}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />

                  {/* Render Signature Fields on current page */}
                  {fields.filter(f => f.pageNumber === currentPage).map((field) => {
                    const isSigned = signatures.some(s => s.fieldId === field.id)
                    const signature = signatures.find(s => s.fieldId === field.id)

                    return (
                      <div
                        key={field.id}
                        className={cn(
                          'absolute border-2 rounded flex items-center justify-center cursor-pointer transition-all',
                          isSigned
                            ? 'border-green-500 bg-green-50 hover:bg-green-100'
                            : 'border-blue-500 bg-blue-50 hover:bg-blue-100 animate-pulse'
                        )}
                        style={{
                          left: `${field.x}px`,
                          top: `${field.y}px`,
                          width: `${field.width}px`,
                          height: `${field.height}px`,
                        }}
                        onClick={() => {
                          if (!isSigned) {
                            setSelectedField(field)
                            setIsSignatureDialogOpen(true)
                          }
                        }}
                      >
                        {isSigned && signature ? (
                          signature.signatureType === 'drawn' ? (
                            <img
                              src={signature.signatureData}
                              alt="Signature"
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <span className="font-serif text-xl px-2 truncate">
                              {signature.signatureData}
                            </span>
                          )
                        ) : (
                          <span className="text-xs font-medium text-blue-700">
                            Click to sign
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Document>

              {/* Page Navigation */}
              {numPages > 1 && (
                <div className="flex items-center justify-center gap-4 p-3 bg-gray-50 rounded-lg">
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
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No document available</p>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleComplete}
              disabled={isLoading || completedFields.length < requiredFields.length}
              className="flex-1 h-14 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Complete Signature
                </>
              )}
            </Button>
            <Button
              onClick={handleDecline}
              variant="destructive"
              disabled={isLoading}
              className="h-14 text-base sm:w-auto"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Signature Dialog */}
      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-none">
          <DialogHeader>
            <DialogTitle>
              {selectedField && getFieldLabel(selectedField.type)}
            </DialogTitle>
            <DialogDescription>
              {reusableSignature
                ? 'Reuse your previous signature or create a new one'
                : 'Create your signature by drawing or typing'}
            </DialogDescription>
          </DialogHeader>

          {/* Option to reuse previous signature */}
          {reusableSignature && (
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Previous Signature Available</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Click below to use your previous signature for this field
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-white border rounded-lg">
                  {reusableSignature.type === 'draw' ? (
                    <img
                      src={reusableSignature.data}
                      alt="Previous signature"
                      className="h-16 w-full object-contain"
                    />
                  ) : (
                    <p className="text-2xl font-serif text-center">{reusableSignature.data}</p>
                  )}
                </div>
                <Button
                  onClick={handleApplyPreviousSignature}
                  disabled={isLoading}
                  className="shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    'Use This Signature'
                  )}
                </Button>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs text-blue-600 text-center">
                  Or create a new signature below
                </p>
              </div>
            </div>
          )}

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
              <div className="border-2 border-dashed rounded-lg p-2 sm:p-4 bg-white">
                <p className="text-xs text-muted-foreground mb-2 text-center">
                  Draw your signature using your finger or mouse
                </p>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full border rounded cursor-crosshair touch-none bg-white"
                  style={{ touchAction: 'none' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawingTouch}
                  onTouchMove={drawTouch}
                  onTouchEnd={stopDrawingTouch}
                  onTouchCancel={stopDrawingTouch}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={clearCanvas}
                className="w-full h-12 text-base"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Clear Signature
              </Button>
            </TabsContent>

            <TabsContent value="type" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typed-signature">Type your full name</Label>
                <Input
                  id="typed-signature"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder={participant.fullName || participant.email}
                  className="text-xl sm:text-2xl font-serif h-12 sm:h-14"
                />
              </div>
              {typedSignature && (
                <div className="p-4 sm:p-8 border-2 rounded-lg bg-white">
                  <p className="text-2xl sm:text-4xl font-serif text-center">{typedSignature}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsSignatureDialogOpen(false)
                setSelectedField(null)
                setTypedSignature('')
                clearCanvas()
              }}
              className="w-full sm:w-auto h-12 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSignature}
              disabled={isLoading}
              className="w-full sm:w-auto h-12 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
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
