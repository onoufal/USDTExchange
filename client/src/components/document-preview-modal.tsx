import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  userId: number | null
  username: string
}

export function DocumentPreviewModal({ isOpen, onClose, userId, username }: DocumentPreviewModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [previewError, setPreviewError] = useState(false)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)
  const documentUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true;

    const fetchDocument = async () => {
      if (!isOpen || !userId) return;

      try {
        console.log('Fetching document for user:', userId);
        setIsLoading(true);
        setPreviewError(false);
        setDocumentUrl(null);

        const response = await fetch(`/api/admin/kyc-document/${userId}`, { method: 'HEAD' });

        if (!isMounted) return;

        if (!response.ok) {
          console.error('Document fetch failed:', response.status, response.statusText);
          throw new Error('Failed to fetch document');
        }

        const contentType = response.headers.get('Content-Type');
        console.log('Document content type:', contentType);

        setIsPdf(contentType === 'application/pdf');
        const url = `/api/admin/kyc-document/${userId}`;
        setDocumentUrl(url);
        documentUrlRef.current = url;
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching document:', error);
          setPreviewError(true);
          toast({
            title: "Error",
            description: "Failed to load document. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDocument();

    return () => {
      isMounted = false;
      if (documentUrlRef.current) {
        console.log('Cleaning up document URL:', documentUrlRef.current);
        URL.revokeObjectURL(documentUrlRef.current);
        documentUrlRef.current = null;
      }
    };
  }, [isOpen, userId, toast]);

  const handleDownload = () => {
    if (!documentUrl) {
      console.log('No document URL available for download');
      return;
    }
    try {
      console.log('Initiating download for document');
      const downloadUrl = `${documentUrl}?download=true`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">KYC Document - {username}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          {isLoading ? (
            <div className="flex items-center justify-center p-4 sm:p-8">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
            </div>
          ) : previewError ? (
            <div className="py-4 sm:py-8 text-center space-y-4">
              <p className="text-sm sm:text-base text-muted-foreground">
                Unable to preview document.
              </p>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Document
              </Button>
            </div>
          ) : !documentUrl ? (
            <div className="py-4 sm:py-8 text-center text-sm sm:text-base text-muted-foreground">
              No document available
            </div>
          ) : isPdf ? (
            <div className="flex flex-col h-[50vh] sm:h-[60vh]">
              <div className="flex-1 relative">
                <iframe
                  src={documentUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  onError={() => {
                    console.error('PDF preview failed');
                    setPreviewError(true);
                  }}
                />
              </div>
              <div className="flex justify-end p-2 sm:p-4 bg-background">
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full max-h-[50vh] sm:max-h-[60vh] overflow-hidden">
                <img 
                  src={documentUrl}
                  alt={`KYC Document for ${username}`}
                  className="w-full h-auto object-contain"
                  onError={() => {
                    console.error('Image preview failed');
                    setPreviewError(true);
                  }}
                  loading="lazy"
                />
              </div>
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