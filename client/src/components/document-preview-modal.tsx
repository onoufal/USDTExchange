import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  userId: number | null
  username: string
}

export function DocumentPreviewModal({ isOpen, onClose, userId, username }: DocumentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [previewError, setPreviewError] = useState(false)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)

  // Reset states and fetch document when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true)
      setPreviewError(false)
      setDocumentUrl(`/api/admin/kyc-document/${userId}`)

      // Detect if PDF by checking the Content-Type header
      fetch(`/api/admin/kyc-document/${userId}`, { method: 'HEAD' })
        .then(response => {
          setIsPdf(response.headers.get('Content-Type') === 'application/pdf')
        })
        .catch(() => {
          setPreviewError(true)
          setIsLoading(false)
        })
    } else {
      setDocumentUrl(null)
    }
  }, [isOpen, userId])

  // Add a loading timeout
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        if (isLoading) {
          setPreviewError(true)
          setIsLoading(false)
        }
      }, 10000) // 10 second timeout
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setPreviewError(true)
    setIsLoading(false)
  }

  const handleDownload = () => {
    if (!documentUrl) return
    window.open(documentUrl, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>KYC Document - {username}</DialogTitle>
        </DialogHeader>

        {documentUrl ? (
          <div className="relative min-h-[60vh]">
            {previewError ? (
              <div className="py-8 text-center space-y-4">
                <p className="text-muted-foreground">
                  Unable to preview document.
                </p>
                <Button onClick={handleDownload} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Document
                </Button>
              </div>
            ) : isPdf ? (
              <>
                <object
                  data={documentUrl}
                  type="application/pdf"
                  className="w-full h-[60vh]"
                  onLoad={handleLoad}
                  onError={handleError}
                >
                  <embed 
                    src={documentUrl} 
                    type="application/pdf"
                    className="w-full h-[60vh]"
                  />
                </object>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <>
                <img 
                  src={documentUrl}
                  alt={`KYC Document for ${username}`}
                  className="max-h-[60vh] mx-auto"
                  onLoad={handleLoad}
                  onError={handleError}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </>
            )}

            {!previewError && (
              <div className="mt-4 flex justify-end">
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No document available
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}