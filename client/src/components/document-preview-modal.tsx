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
          const contentType = response.headers.get('Content-Type');
          setIsPdf(contentType === 'application/pdf');
          setIsLoading(false);
        })
        .catch(() => {
          setPreviewError(true)
          setIsLoading(false)
        })
    } else {
      setDocumentUrl(null)
      setIsLoading(false)
    }
  }, [isOpen, userId])

  const handleDownload = () => {
    if (!documentUrl) return
    window.open(documentUrl, '_blank')
  }

  const ImagePreview = () => (
    <div className="flex flex-col items-center gap-4">
      <img 
        src={documentUrl!}
        alt={`KYC Document for ${username}`}
        className="max-h-[60vh] w-auto object-contain"
        onError={() => setPreviewError(true)}
      />
      <Button onClick={handleDownload} variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Download Image
      </Button>
    </div>
  )

  const PdfPreview = () => (
    <div className="w-full h-[60vh] relative">
      <iframe
        src={`${documentUrl}#toolbar=0`}
        className="w-full h-full border-0"
        title={`KYC Document for ${username}`}
      >
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            PDF preview not available. Please download to view.
          </p>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </iframe>
    </div>
  )

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
            ) : isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : isPdf ? (
              <PdfPreview />
            ) : (
              <ImagePreview />
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