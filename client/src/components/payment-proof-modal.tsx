import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

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
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (isOpen && transactionId) {
      setIsLoading(true);
      setPreviewError(false);
      fetch(`/api/admin/payment-proof/${transactionId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch document");
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setDocumentUrl(url);
        })
        .catch(() => setPreviewError(true))
        .finally(() => setIsLoading(false));
    } else {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
      setDocumentUrl(null);
    }
  }, [isOpen, transactionId]);

  const handleDownload = () => {
    if (transactionId) {
      window.open(`/api/admin/payment-proof/${transactionId}?download=true`, '_blank');
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
                  onError={() => setPreviewError(true)}
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
