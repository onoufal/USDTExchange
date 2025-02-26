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
import { CheckCircle2, XCircle, Clock, Upload, PhoneCall, FileText, Info, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

// Schema definitions
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

  // Calculate overall verification progress
  const verificationProgress = (() => {
    let progress = 0;
    if (user?.mobileVerified) progress += 50;
    if (user?.kycStatus === 'approved') progress += 50;
    return progress;
  })();

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
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Verification Progress</span>
          <span className="text-muted-foreground">{verificationProgress}% Complete</span>
        </div>
        <Progress value={verificationProgress} className="h-2" />
      </div>

      {/* Verification Steps */}
      <div className="space-y-4">
        {/* Mobile Verification Step */}
        <Card className={`border transition-colors duration-200 ${user?.mobileVerified ? 'bg-primary/5 border-primary/20' : ''}`}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Mobile Verification</h3>
              </div>
              <Badge variant={user?.mobileVerified ? "default" : "destructive"} className="font-medium">
                {user?.mobileVerified ? (
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                ) : (
                  <XCircle className="w-4 h-4 mr-1.5" />
                )}
                {user?.mobileVerified ? "Verified" : "Required"}
              </Badge>
            </div>

            {!user?.mobileVerified && (
              <>
                <Alert variant="default" className="flex items-center gap-3 bg-muted/50">
                  <div className="shrink-0">
                    <Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <AlertTitle className="text-base font-semibold">Verification Steps</AlertTitle>
                    <AlertDescription className="text-sm space-y-2">
                      <p>1. Enter your Jordanian mobile number</p>
                      <p>2. Receive verification code via SMS</p>
                      <p>3. Enter code to complete verification</p>
                    </AlertDescription>
                  </div>
                </Alert>

                <Form {...mobileForm}>
                  <form onSubmit={mobileForm.handleSubmit((data) => mobileVerificationMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={mobileForm.control}
                      name="mobileNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="07xxxxxxxx"
                              {...field}
                              maxLength={10}
                              className="font-mono text-base"
                            />
                          </FormControl>
                          <FormDescription className="text-sm">
                            Enter your Jordanian mobile number (starts with 077, 078, or 079)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full font-medium"
                      disabled={mobileVerificationMutation.isPending}
                    >
                      {mobileVerificationMutation.isPending ? "Verifying..." : "Verify Mobile"}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </CardContent>
        </Card>

        {/* KYC Document Verification Step */}
        <Card className={`border transition-colors duration-200 ${user?.kycStatus === 'approved' ? 'bg-primary/5 border-primary/20' : ''}`}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-medium">ID Verification</h3>
              </div>
              <Badge
                variant={
                  user?.kycStatus === "approved" ? "default" :
                    user?.kycStatus === "pending" ? "secondary" : "destructive"
                }
                className="font-medium"
              >
                {user?.kycStatus === "approved" ? (
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                ) : user?.kycStatus === "pending" ? (
                  <Clock className="w-4 h-4 mr-1.5" />
                ) : (
                  <XCircle className="w-4 h-4 mr-1.5" />
                )}
                {user?.kycStatus === "approved"
                  ? "Verified"
                  : user?.kycStatus === "pending"
                    ? "Pending Review"
                    : "Required"}
              </Badge>
            </div>

            {user?.kycStatus === "approved" ? (
              <Alert variant="success" className="bg-primary/5 text-primary border-primary/20 flex items-center gap-3">
                <div className="shrink-0">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <AlertDescription className="text-sm font-medium">
                  Your ID has been verified successfully
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {!user?.mobileVerified ? (
                  <Alert variant="warning" className="flex items-center gap-3">
                    <div className="shrink-0">
                      <AlertCircle className="h-5 w-5 text-warning-foreground" aria-hidden="true" />
                    </div>
                    <AlertDescription className="text-sm">
                      Please verify your mobile number first
                    </AlertDescription>
                  </Alert>
                ) : user?.kycStatus === "pending" && user?.kycDocument ? (
                  <Alert variant="warning" className="flex items-center gap-3">
                    <div className="shrink-0">
                      <Clock className="h-5 w-5 text-warning-foreground" aria-hidden="true" />
                    </div>
                    <AlertDescription className="text-sm">
                      Your document is under review. We'll notify you once approved.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Alert variant="default" className="flex items-center gap-3 bg-muted/50">
                      <div className="shrink-0">
                        <Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                        <AlertTitle className="text-base font-semibold">Document Requirements</AlertTitle>
                        <AlertDescription className="space-y-2">
                          <ul className="text-sm space-y-1.5 list-disc pl-4">
                            <li>Valid government-issued ID</li>
                            <li>Clearly visible full name</li>
                            <li>Not expired</li>
                            <li>Well-lit and readable</li>
                          </ul>
                          <p className="text-sm text-muted-foreground">
                            Supported formats: JPG, PNG, or PDF
                          </p>
                        </AlertDescription>
                      </div>
                    </Alert>

                    <Form {...documentForm}>
                      <form className="space-y-4">
                        <FormField
                          control={documentForm.control}
                          name="document"
                          render={({ field: { onChange, ...field } }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Upload Document</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-3">
                                  <Input
                                    type="file"
                                    onChange={(e) => {
                                      handleFileChange(e);
                                      onChange(e.target.files?.[0]);
                                    }}
                                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                                    disabled={!user?.mobileVerified || kycDocumentMutation.isPending}
                                    className="text-sm file:text-sm file:font-medium file:bg-muted file:hover:bg-muted/80 file:transition-colors"
                                  />
                                  {uploadProgress > 0 && (
                                    <Progress value={uploadProgress} className="w-[60px]" />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          className="w-full font-medium"
                          disabled={!file || !user?.mobileVerified || kycDocumentMutation.isPending}
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
                            <>
                              <Upload className="h-4 w-4 mr-2 animate-bounce" />
                              Uploading...
                            </>
                          ) : (
                            "Upload Document"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}