import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";

const MOCK_RATE = 0.71; // 1 USDT = 0.71 JOD

export default function TradeForm() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "buy",
      amount: "",
      rate: MOCK_RATE.toString(),
    },
  });

  useEffect(() => {
    setUploadProgress(0);
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG or PNG image",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }

      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }
    }
    setFile(selectedFile);
  };

  const tradeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
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
            reject(new Error(xhr.responseText || "Trade submission failed"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Trade submission failed")));
      });

      xhr.open("POST", "/api/trade");
      xhr.withCredentials = true;
      xhr.send(formData);

      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      form.reset();
      setFile(null);
      setUploadProgress(0);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      toast({
        title: "Trade submitted",
        description: "Your trade request has been submitted for approval",
      });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({
        title: "Trade failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: any) => {
    if (!file) {
      toast({
        title: "Missing payment proof",
        description: "Please upload your payment proof",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("type", values.type);
    formData.append("amount", values.amount.toString());
    formData.append("rate", values.rate.toString());
    formData.append("proofOfPayment", file);

    tradeMutation.mutate(formData);
  };

  const isUploading = tradeMutation.isPending && uploadProgress > 0;

  return (
    <Tabs defaultValue="buy" onValueChange={(value) => form.setValue("type", value)}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="buy">Buy USDT</TabsTrigger>
        <TabsTrigger value="sell">Sell USDT</TabsTrigger>
      </TabsList>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ({form.watch("type") === "buy" ? "JOD" : "USDT"})</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  Enter the amount you want to {form.watch("type")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between mb-2">
              <span>Rate</span>
              <span>1 USDT = {MOCK_RATE} JOD</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>You will {form.watch("type") === "buy" ? "receive" : "pay"}</span>
              <span>
                {(Number(form.watch("amount") || 0) * (form.watch("type") === "buy" ? (1/MOCK_RATE) : MOCK_RATE)).toFixed(2)} {form.watch("type") === "buy" ? "USDT" : "JOD"}
              </span>
            </div>
          </div>

          <div>
            <FormLabel>Payment Proof</FormLabel>
            <Input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="mt-2"
            />
            <FormDescription className="text-xs mt-1">
              Upload a screenshot of your payment (JPG or PNG, max 5MB)
            </FormDescription>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={tradeMutation.isPending}
          >
            {tradeMutation.isPending ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-bounce" />
                Processing...
              </>
            ) : (
              "Submit Trade"
            )}
          </Button>
        </form>
      </Form>
    </Tabs>
  );
}