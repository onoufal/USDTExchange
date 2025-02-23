import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  documentBase64: string | null
  username: string
}

export function DocumentPreviewModal({ isOpen, onClose, documentBase64, username }: DocumentPreviewModalProps) {
  const [isPdfLoading, setIsPdfLoading] = useState(true)
  const isPdf = documentBase64?.startsWith('data:application/pdf')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>KYC Document - {username}</DialogTitle>
        </DialogHeader>
        
        {documentBase64 ? (
          <div className="relative min-h-[60vh]">
            {isPdf ? (
              <>
                <iframe 
                  src={documentBase64}
                  className="w-full h-[60vh]"
                  onLoad={() => setIsPdfLoading(false)}
                />
                {isPdfLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <img 
                src={documentBase64} 
                alt={`KYC Document for ${username}`}
                className="max-h-[60vh] mx-auto"
              />
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
