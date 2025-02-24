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

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true)
      setPreviewError(false)
      setDocumentUrl(null)

      fetch(`/api/admin/kyc-document/${userId}`, { method: 'HEAD' })
        .then(response => {
          const contentType = response.headers.get('Content-Type')
          setIsPdf(contentType === 'application/pdf')
          setDocumentUrl(`/api/admin/kyc-document/${userId}`)
          setIsLoading(false)
        })
        .catch(() => {
          setPreviewError(true)
          setIsLoading(false)
        })
    }
  }, [isOpen, userId])

  const handleDownload = () => {
    if (!documentUrl) return
    window.open(`${documentUrl}?download=true`, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>KYC Document - {username}</DialogTitle>
        </DialogHeader>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : previewError ? (
            <div className="py-8 text-center space-y-4">
              <p className="text-muted-foreground">
                Unable to preview document.
              </p>
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Document
              </Button>
            </div>
          ) : !documentUrl ? (
            <div className="py-8 text-center text-muted-foreground">
              No document available
            </div>
          ) : isPdf ? (
            <div className="flex flex-col h-[60vh]">
              <div className="flex-1 relative">
                <object
                  data={documentUrl}
                  type="application/pdf"
                  className="absolute inset-0 w-full h-full border-0"
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
                </object>
              </div>
              <div className="flex justify-end p-4 bg-background">
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <img 
                src={documentUrl}
                alt={`KYC Document for ${username}`}
                className="max-h-[60vh] w-auto object-contain"
                onError={() => setPreviewError(true)}
              />
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Image
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}