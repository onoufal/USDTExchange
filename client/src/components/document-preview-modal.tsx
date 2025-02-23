import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  documentBase64: string | null
  username: string
}

export function DocumentPreviewModal({ isOpen, onClose, documentBase64, username }: DocumentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [previewError, setPreviewError] = useState(false)
  const isPdf = documentBase64?.startsWith('data:application/pdf')

  // Reset states when modal opens or document changes
  useEffect(() => {
    if (isOpen && documentBase64) {
      setIsLoading(true)
      setPreviewError(false)
    }
  }, [isOpen, documentBase64])

  const handlePreviewError = () => {
    setPreviewError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleDownload = () => {
    if (!documentBase64) return

    const link = document.createElement('a')
    link.href = documentBase64
    link.download = `kyc-document-${username}${isPdf ? '.pdf' : '.jpg'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>KYC Document - {username}</DialogTitle>
        </DialogHeader>

        {documentBase64 ? (
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
                  data={documentBase64}
                  type="application/pdf"
                  className="w-full h-[60vh]"
                  onLoad={handleLoad}
                  onError={handlePreviewError}
                >
                  <embed 
                    src={documentBase64} 
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
                  src={documentBase64} 
                  alt={`KYC Document for ${username}`}
                  className="max-h-[60vh] mx-auto"
                  onLoad={handleLoad}
                  onError={handlePreviewError}
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