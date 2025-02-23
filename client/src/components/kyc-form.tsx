import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const mobileSchema = z.object({
  mobileNumber: z
    .string()
    .regex(/^07[789]\d{7}$/, {
      message: "Please enter a valid Jordanian mobile number starting with 077, 078, or 079",
    }),
});

const documentSchema = z.object({
  document: z.instanceof(File).refine((file) => {
    if (!file) return false;
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const extension = file.name.toLowerCase().match(/\.[^.]*$/)?.[0];
    return validTypes.includes(file.type) && validExtensions.includes(extension);
  }, "Please upload a valid JPG, PNG, or PDF file")
});

export default function KYCForm() {
  // All hooks at the top
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mobileForm = useForm({
    resolver: zodResolver(mobileSchema),
    defaultValues: {
      mobileNumber: user?.mobileNumber || "",
    },
  });

  const documentForm = useForm({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      document: undefined,
    },
  });

  const mobileVerificationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof mobileSchema>) => {
      const res = await apiRequest("POST", "/api/kyc/mobile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Mobile verified",
        description: "Your mobile number has been verified successfully",
      });
    },
  });

  // Reset upload progress when file changes
  useEffect(() => {
    setUploadProgress(0);
  }, [file]);

  const kycDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      // Validate file type before uploading
      if (!documentSchema.shape.document.parse(file)) {
        throw new Error("Invalid file type. Please upload a JPG, PNG, or PDF file");
      }

      const formData = new FormData();
      formData.append("document", file);

      const xhr = new XMLHttpRequest();

      const promise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.responseText || "Upload failed"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
      });

      xhr.open("POST", "/api/kyc/document");
      xhr.withCredentials = true;
      xhr.send(formData);

      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setFile(null);
      setUploadProgress(0);
      // Instead of resetting the entire form, we'll just clear the file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      toast({
        title: "Document uploaded",
        description: "Your KYC document has been submitted for review",
      });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isUploading = kycDocumentMutation.isPending && uploadProgress > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
      const extension = selectedFile.name.toLowerCase().match(/\.[^.]*$/)?.[0];

      if (!validTypes.includes(selectedFile.type) || !validExtensions.includes(extension || '')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG, PNG, or PDF file",
          variant: "destructive",
        });
        e.target.value = ''; // Reset the input
        return;
      }
    }
    setFile(selectedFile);
  };

  return (
    <div className="space-y-6">
      {/* Mobile Verification Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Mobile Verification</h3>
          <Badge variant={user?.mobileVerified ? "default" : "destructive"}>
            {user?.mobileVerified ? (
              <CheckCircle2 className="w-4 h-4 mr-1" />
            ) : (
              <XCircle className="w-4 h-4 mr-1" />
            )}
            {user?.mobileVerified ? "Verified" : "Not Verified"}
          </Badge>
        </div>

        {!user?.mobileVerified && (
          <Form {...mobileForm}>
            <form onSubmit={mobileForm.handleSubmit((data) => mobileVerificationMutation.mutate(data))} className="space-y-4">
              <FormField
                control={mobileForm.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="07xxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Enter your Jordanian mobile number starting with 077, 078, or 079
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={mobileVerificationMutation.isPending}
              >
                {mobileVerificationMutation.isPending ? "Verifying..." : "Verify Mobile"}
              </Button>
            </form>
          </Form>
        )}
      </div>

      {/* KYC Document Upload Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">KYC Verification</h3>
          <Badge variant={
            user?.kycStatus === "approved" ? "default" :
            user?.kycStatus === "pending" ? "secondary" : "destructive"
          }>
            {user?.kycStatus === "approved" ? (
              <CheckCircle2 className="w-4 h-4 mr-1" />
            ) : user?.kycStatus === "pending" ? (
              <Clock className="w-4 h-4 mr-1" />
            ) : (
              <XCircle className="w-4 h-4 mr-1" />
            )}
            {user?.kycStatus === "approved" ? "Approved" :
             user?.kycStatus === "pending" ? "Pending Review" : "Not Submitted"}
          </Badge>
        </div>

        {user?.kycStatus !== "approved" && (
          <div className="space-y-4">
            {!user?.mobileVerified && (
              <Alert>
                <AlertDescription className="text-sm">
                  Please verify your mobile number before uploading KYC documents
                </AlertDescription>
              </Alert>
            )}

            <FormItem>
              <FormLabel>Identity Document</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  disabled={!user?.mobileVerified || isUploading}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Upload a clear photo or scan of your ID card or passport (JPG, PNG, or PDF format)
              </FormDescription>
            </FormItem>

            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-xs text-center text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            <Button
              type="button"
              className="w-full"
              disabled={!file || !user?.mobileVerified || kycDocumentMutation.isPending}
              onClick={() => file && kycDocumentMutation.mutate(file)}
            >
              {kycDocumentMutation.isPending ? (
                <Upload className="w-4 h-4 mr-2 animate-bounce" />
              ) : null}
              {kycDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
            </Button>

            {user?.kycStatus === "pending" && (
              <Alert>
                <AlertDescription className="text-sm">
                  Your document is under review. We'll notify you once it's approved.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  );
}