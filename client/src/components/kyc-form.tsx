import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

const mobileSchema = z.object({
  mobileNumber: z.string().regex(/^07[789]\d{7}$/, "Invalid Jordanian mobile number"),
});

export default function KYCForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);

  const form = useForm({
    resolver: zodResolver(mobileSchema),
    defaultValues: {
      mobileNumber: user?.mobileNumber || "",
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

  const kycDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      const res = await fetch("/api/kyc/document", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setFile(null);
      toast({
        title: "Document uploaded",
        description: "Your KYC document has been submitted for review",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Mobile Verification */}
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mobileVerificationMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="07xxxxxxxx" {...field} />
                    </FormControl>
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

      {/* KYC Document Upload */}
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
             user?.kycStatus === "pending" ? "Pending" : "Not Submitted"}
          </Badge>
        </div>

        {user?.kycStatus !== "approved" && (
          <div className="space-y-4">
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept="image/*,.pdf"
            />
            <Button
              className="w-full"
              disabled={!file || kycDocumentMutation.isPending}
              onClick={() => file && kycDocumentMutation.mutate(file)}
            >
              {kycDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
