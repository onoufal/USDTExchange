import { useState } from "react";
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
import { Check, Loader2, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const paymentSettingsSchema = z.object({
  // Exchange Rate Settings
  buyRate: z.string()
    .regex(/^\d+(\.\d{1,4})?$/, "Rate must be a valid number with up to 4 decimal places")
    .transform(Number),
  buyCommissionPercentage: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Commission must be a valid percentage with up to 2 decimal places")
    .transform(Number)
    .refine(value => value >= 0 && value <= 100, "Commission must be between 0 and 100"),
  sellRate: z.string()
    .regex(/^\d+(\.\d{1,4})?$/, "Rate must be a valid number with up to 4 decimal places")
    .transform(Number),
  sellCommissionPercentage: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Commission must be a valid percentage with up to 2 decimal places")
    .transform(Number)
    .refine(value => value >= 0 && value <= 100, "Commission must be between 0 and 100"),

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
  const [copyingCliqAlias, setCopyingCliqAlias] = useState(false);
  const [copyingMobileWallet, setCopyingMobileWallet] = useState(false);

  const { data: settings, isLoading, isError } = useQuery<PaymentSettings>({
    queryKey: ["/api/settings/payment"],
    staleTime: 1000,
    retry: 3
  });

  const form = useForm<PaymentSettings>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      buyRate: "0.71",
      buyCommissionPercentage: "1.00",
      sellRate: "0.71",
      sellCommissionPercentage: "1.00",
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

  const copyToClipboard = async (text: string, field: 'cliqAlias' | 'mobileWallet') => {
    try {
      await navigator.clipboard.writeText(text);
      if (field === 'cliqAlias') {
        setCopyingCliqAlias(true);
        setTimeout(() => setCopyingCliqAlias(false), 2000);
      } else {
        setCopyingMobileWallet(true);
        setTimeout(() => setCopyingMobileWallet(false), 2000);
      }
      toast({
        title: "Copied",
        description: "Text has been copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try copying manually",
        variant: "destructive",
      });
    }
  };

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
        {/* Exchange Rate Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Exchange Rate Settings</CardTitle>
            <CardDescription>
              Configure exchange rates and commission percentages for Buy and Sell orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buy Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Buy USDT Settings</h3>
                <FormField
                  control={form.control}
                  name="buyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange Rate (JOD/USDT)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" min="0" placeholder="0.7100" {...field} />
                      </FormControl>
                      <FormDescription>
                        The exchange rate for buying USDT with JOD
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyCommissionPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Percentage</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" max="100" placeholder="1.00" {...field} />
                      </FormControl>
                      <FormDescription>
                        Commission percentage for buy orders (0-100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sell Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Sell USDT Settings</h3>
                <FormField
                  control={form.control}
                  name="sellRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange Rate (JOD/USDT)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" min="0" placeholder="0.7100" {...field} />
                      </FormControl>
                      <FormDescription>
                        The exchange rate for selling USDT for JOD
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellCommissionPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Percentage</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" max="100" placeholder="1.00" {...field} />
                      </FormControl>
                      <FormDescription>
                        Commission percentage for sell orders (0-100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="Enter your CliQ alias" {...field} />
                    </FormControl>
                    {settings?.cliqAlias && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => copyToClipboard(settings.cliqAlias, 'cliqAlias')}
                      >
                        {copyingCliqAlias ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
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
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="07XXXXXXXX" {...field} />
                    </FormControl>
                    {settings?.mobileWallet && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => copyToClipboard(settings.mobileWallet, 'mobileWallet')}
                      >
                        {copyingMobileWallet ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
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