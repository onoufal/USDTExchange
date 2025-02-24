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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JORDANIAN_BANKS } from "@shared/schema";
import { Check, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const paymentSettingsSchema = z.object({
  // USDT Settings
  usdtAddressTRC20: z.string().min(30, "USDT address is too short").max(50, "USDT address is too long"),
  usdtAddressBEP20: z.string().min(30, "USDT address is too short").max(50, "USDT address is too long"),

  // CliQ Settings
  cliqAlias: z.string().min(1, "CliQ alias is required"),
  cliqBankName: z.string().min(1, "Bank name is required"),
  cliqAccountHolder: z.string().min(1, "Account holder name is required"),

  // Mobile Wallet Settings
  mobileWallet: z.string().regex(/^07[789]\d{7}$/, {
    message: "Invalid Jordanian mobile number format"
  }),
  walletType: z.string().min(1, "Wallet type is required"),
  walletHolderName: z.string().min(1, "Wallet holder name is required"),
});

type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

const WALLET_TYPES = ["Orange Money", "Zain Cash", "U Wallet"];

export default function AdminPaymentSettings() {
  const { toast } = useToast();

  const { data: settings, isLoading, isError } = useQuery<PaymentSettings>({
    queryKey: ["/api/settings/payment"],
    staleTime: 1000,
    retry: 3
  });

  const form = useForm<PaymentSettings>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      usdtAddressTRC20: "",
      usdtAddressBEP20: "",
      cliqAlias: "",
      cliqBankName: JORDANIAN_BANKS[0],
      cliqAccountHolder: "",
      mobileWallet: "",
      walletType: WALLET_TYPES[0],
      walletHolderName: "",
    },
    values: settings
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: PaymentSettings) => {
      const res = await apiRequest("POST", "/api/admin/settings/payment", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment"] });
      toast({
        title: "Settings updated successfully",
        description: "Payment settings have been saved and are now active",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>
          Failed to load payment settings. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(data => updateSettingsMutation.mutate(data))} className="space-y-6">
        {/* USDT Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>USDT Wallet Settings</CardTitle>
            <CardDescription>
              Configure USDT wallet addresses for each supported network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="usdtAddressTRC20"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>USDT Address (TRC20)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your TRC20 USDT wallet address" {...field} />
                  </FormControl>
                  <FormDescription>
                    USDT wallet address on the Tron (TRC20) network
                  </FormDescription>
                  <FormMessage />
                  {settings?.usdtAddressTRC20 && (
                    <div className="mt-2 text-sm flex items-center gap-2 text-green-600">
                      <Check className="h-4 w-4" />
                      <span>TRC20 address is active</span>
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="usdtAddressBEP20"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>USDT Address (BEP20)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your BEP20 USDT wallet address" {...field} />
                  </FormControl>
                  <FormDescription>
                    USDT wallet address on the Binance Smart Chain (BEP20) network
                  </FormDescription>
                  <FormMessage />
                  {settings?.usdtAddressBEP20 && (
                    <div className="mt-2 text-sm flex items-center gap-2 text-green-600">
                      <Check className="h-4 w-4" />
                      <span>BEP20 address is active</span>
                    </div>
                  )}
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* CliQ Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>CliQ Settings</CardTitle>
            <CardDescription>
              Configure CliQ payment options for receiving JOD
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="cliqAlias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CliQ Alias</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your CliQ alias" {...field} />
                  </FormControl>
                  <FormMessage />
                  {settings?.cliqAlias && (
                    <div className="mt-2 text-sm flex items-center gap-2 text-green-600">
                      <Check className="h-4 w-4" />
                      <span>CliQ alias is active</span>
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cliqBankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {JORDANIAN_BANKS.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cliqAccountHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter account holder name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Mobile Wallet Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Mobile Wallet Settings</CardTitle>
            <CardDescription>
              Configure mobile wallet payment options for receiving JOD
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    Enter a valid Jordanian mobile number (e.g., 0791234567)
                  </FormDescription>
                  <FormMessage />
                  {settings?.mobileWallet && (
                    <div className="mt-2 text-sm flex items-center gap-2 text-green-600">
                      <Check className="h-4 w-4" />
                      <span>Mobile wallet number is active</span>
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="walletType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WALLET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="walletHolderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Holder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter wallet holder name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full"
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving Settings...
            </>
          ) : (
            "Save All Settings"
          )}
        </Button>
      </form>
    </Form>
  );
}