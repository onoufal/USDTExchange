import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const paymentSettingsSchema = z.object({
  cliqAlias: z.string().min(1, "CliQ alias is required"),
  mobileWallet: z.string().regex(/^07[789]\d{7}$/, {
    message: "Invalid Jordanian mobile number format"
  }),
  usdtAddress: z.string().min(30, "USDT address is too short").max(50, "USDT address is too long"),
  usdtNetwork: z.string().min(1, "USDT network is required")
});

type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

export default function AdminPaymentSettings() {
  const { toast } = useToast();

  const { data: settings } = useQuery<PaymentSettings>({
    queryKey: ["/api/settings/payment"],
  });

  const form = useForm<PaymentSettings>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: settings || {
      cliqAlias: "",
      mobileWallet: "",
      usdtAddress: "",
      usdtNetwork: "TRC20"
    },
    values: settings
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: PaymentSettings) => {
      const res = await apiRequest("POST", "/api/admin/settings/payment", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update payment settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment"] });
      toast({
        title: "Settings updated",
        description: "Platform payment settings have been saved"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Settings</CardTitle>
        <CardDescription>
          Configure the platform's payment receiving options for JOD and USDT transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => updateSettingsMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="cliqAlias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CliQ Alias</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your CliQ alias" {...field} />
                  </FormControl>
                  <FormDescription>
                    Users will send JOD to this CliQ alias
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobileWallet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Wallet Number</FormLabel>
                  <FormControl>
                    <Input placeholder="07XXXXXXXX" {...field} />
                  </FormControl>
                  <FormDescription>
                    Alternative payment option for mobile wallet transfers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="usdtAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform USDT Wallet Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your USDT wallet address" {...field} />
                  </FormControl>
                  <FormDescription>
                    Users will send USDT to this address when selling
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="usdtNetwork"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>USDT Network</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. TRC20" {...field} />
                  </FormControl>
                  <FormDescription>
                    Specify the USDT network type (e.g. TRC20, ERC20)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}