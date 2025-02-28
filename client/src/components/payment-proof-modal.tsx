import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: number | null;
  username: string;
}

export function PaymentProofModal({
  isOpen,
  onClose,
  transactionId,
  username,
}: PaymentProofModalProps) {
  const { toast } = useToast();
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const documentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDocument = async () => {
      if (!isOpen || !transactionId) return;

      try {
        console.log('Fetching payment proof for transaction:', transactionId);
        setIsLoading(true);
        setPreviewError(false);
        setDocumentUrl(null);

        const response = await fetch(`/api/admin/payment-proof/${transactionId}`);

        if (!isMounted) return;

        if (!response.ok) {
          console.error('Payment proof fetch failed:', response.status, response.statusText);
          throw new Error("Failed to fetch document");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        console.log('Created blob URL for payment proof');
        setDocumentUrl(url);
        documentUrlRef.current = url;
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching payment proof:', error);
          setPreviewError(true);
          toast({
            title: "Error",
            description: "Failed to load payment proof. Please try again.",
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
        console.log('Cleaning up payment proof URL:', documentUrlRef.current);
        URL.revokeObjectURL(documentUrlRef.current);
        documentUrlRef.current = null;
      }
    };
  }, [isOpen, transactionId, toast]);

  const handleDownload = () => {
    if (!transactionId) {
      console.log('No transaction ID available for download');
      return;
    }

    try {
      console.log('Initiating download for payment proof');
      const downloadUrl = `/api/admin/payment-proof/${transactionId}?download=true`;
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
        description: "Unable to download the payment proof. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Payment Proof - {username}</DialogTitle>
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
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full max-h-[50vh] sm:max-h-[60vh] overflow-hidden">
                <img 
                  src={documentUrl}
                  alt={`Payment Proof for ${username}`}
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
  );
}