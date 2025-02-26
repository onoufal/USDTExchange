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
import { CheckCircle2, XCircle, Clock, Upload, PhoneCall, FileText, HelpCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";

// Schema definitions remain unchanged
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

    const extension = (file.name.toLowerCase().match(/\.[^.]*$/) || ['.unknown'])[0];

    return validTypes.includes(file.type) && validExtensions.includes(extension);
  }, "Please upload a valid JPG, PNG, or PDF file")
});

export default function KYCForm() {
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

  // Mutations remain unchanged
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

  useEffect(() => {
    setUploadProgress(0);
  }, [file]);

  const kycDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
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
        e.target.value = '';
        return;
      }
    }
    setFile(selectedFile);
  };

  return (
    <div className="space-y-8">
      {/* Verification Steps Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className={`p-4 border transition-colors duration-200 ${user?.mobileVerified ? 'bg-primary/5 border-primary/20' : 'bg-muted/5'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-background">
              <span className="text-sm font-medium">1</span>
            </div>
            <h4 className="font-medium">Mobile Verification</h4>
          </div>
          <p className="text-sm text-muted-foreground pl-10">
            Verify your phone number to receive important updates and trade notifications
          </p>
        </Card>
        <Card className={`p-4 border transition-colors duration-200 ${user?.kycStatus === 'approved' ? 'bg-primary/5 border-primary/20' : 'bg-muted/5'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-background">
              <span className="text-sm font-medium">2</span>
            </div>
            <h4 className="font-medium">ID Verification</h4>
          </div>
          <p className="text-sm text-muted-foreground pl-10">
            Upload your government-issued ID to enable trading
          </p>
        </Card>
      </div>

      {/* Mobile Verification Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-primary" />
            <h3 className="text-base sm:text-lg font-medium">Mobile Verification</h3>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-transparent">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Mobile verification info</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" className="max-w-[300px] p-3">
                  <p className="text-sm">
                    Verify your mobile number to enable secure trading. You'll receive important notifications and updates about your trades.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant={user?.mobileVerified ? "default" : "destructive"} className="shadow-sm">
            {user?.mobileVerified ? (
              <CheckCircle2 className="w-4 h-4 mr-1" />
            ) : (
              <XCircle className="w-4 h-4 mr-1" />
            )}
            {user?.mobileVerified ? "Verified" : "Not Verified"}
          </Badge>
        </div>

        {!user?.mobileVerified && (
          <>
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Verification Process</AlertTitle>
              <AlertDescription>
                1. Enter your Jordanian mobile number
                <br />
                2. You'll receive a verification code via SMS
                <br />
                3. Enter the code to complete verification
              </AlertDescription>
            </Alert>

            <Form {...mobileForm}>
              <form onSubmit={mobileForm.handleSubmit((data) => mobileVerificationMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={mobileForm.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="07xxxxxxxx" 
                          {...field} 
                          className="w-full"
                          maxLength={10}
                        />
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
          </>
        )}
      </div>

      {/* KYC Document Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-base sm:text-lg font-medium">KYC Verification</h3>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-transparent">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">KYC verification info</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" className="max-w-[300px] p-3">
                  <p className="text-sm">
                    KYC (Know Your Customer) verification helps us maintain a secure trading environment. Upload a clear photo of your government-issued ID to get verified.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant={
            user?.kycStatus === "approved" ? "default" :
              user?.kycStatus === "pending" ? "secondary" : "destructive"
          } className="shadow-sm">
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

        {user?.kycStatus === "approved" ? (
          <Alert variant="success" className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <AlertDescription className="text-sm font-medium">
              KYC Approved - You can now trade on the platform
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {!user?.mobileVerified && (
              <Alert variant="warning" className="flex items-center gap-2">
                <AlertDescription className="text-sm">
                  Please verify your mobile number before uploading KYC documents
                </AlertDescription>
              </Alert>
            )}

            {user?.mobileVerified && !user?.kycDocument && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Document Requirements</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Please ensure your ID document:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Is a valid government-issued ID</li>
                    <li>Shows your full name clearly</li>
                    <li>Is not expired</li>
                    <li>Is well-lit and readable</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Supported formats: JPG, PNG, or PDF
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <Form {...documentForm}>
              <form className="space-y-4">
                <FormField
                  control={documentForm.control}
                  name="document"
                  render={({ field: { onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Identity Document</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          onChange={(e) => {
                            handleFileChange(e);
                            onChange(e.target.files?.[0]);
                          }}
                          accept="image/jpeg,image/png,image/jpg,application/pdf"
                          disabled={!user?.mobileVerified || isUploading || user?.kycStatus === "approved"}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Upload a clear photo or scan of your ID card or passport (JPG, PNG, or PDF format)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-xs text-center text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}

                {user?.kycDocument && user?.kycStatus === "pending" && (
                  <Alert variant="warning" className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <AlertDescription className="text-sm">
                      Your document is under review. We'll notify you once it's approved.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="button"
                  className="w-full"
                  disabled={!file || !user?.mobileVerified || kycDocumentMutation.isPending || user?.kycStatus === "approved"}
                  onClick={() => {
                    if (file) {
                      documentForm.trigger("document").then((isValid) => {
                        if (isValid) {
                          kycDocumentMutation.mutate(file);
                        }
                      });
                    }
                  }}
                >
                  {kycDocumentMutation.isPending ? (
                    <Upload className="h-4 w-4 mr-2 animate-bounce" />
                  ) : null}
                  {kycDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}