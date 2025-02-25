import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JORDANIAN_BANKS } from "@shared/schema";
import { Check, Loader2, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const paymentSettingsSchema = z.object({
  // Rate Settings
  buyRate: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Buy rate must be a positive number"),
  buyCommissionRate: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1, "Buy commission must be between 0 and 1"),
  sellRate: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Sell rate must be a positive number"),
  sellCommissionRate: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1, "Sell commission must be between 0 and 1"),

  // USDT Settings
  usdtAddressTRC20: z
    .string()
    .min(30, "USDT address is too short")
    .max(50, "USDT address is too long"),
  usdtAddressBEP20: z
    .string()
    .min(30, "USDT address is too short")
    .max(50, "USDT address is too long"),

  // CliQ Settings
  cliqAlias: z.string().min(1, "CliQ alias is required"),
  cliqBankName: z.string().min(1, "Bank name is required"),
  cliqAccountHolder: z.string().min(1, "Account holder name is required"),

  // Mobile Wallet Settings
  mobileWallet: z.string().regex(/^07[789]\d{7}$/, {
    message: "Invalid Jordanian mobile number format",
  }),
  walletType: z.string().min(1, "Wallet type is required"),
  walletHolderName: z.string().min(1, "Wallet holder name is required"),
});

type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

const WALLET_TYPES = ["Orange Money", "Zain Cash", "U Wallet"];

export default function AdminPaymentSettings() {
  const { toast } = useToast();

  const [copyingField, setCopyingField] = useState<null | "cliqAlias" | "mobileWallet">(null);

  const { data: settings, isLoading, isError } = useQuery<PaymentSettings>({
    queryKey: ["/api/settings/payment"],
    staleTime: 1000,
    retry: 3,
  });

  // React Hook Form Setup with empty defaultValues; we'll populate via setValue
  const form = useForm<PaymentSettings>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      buyRate: "",
      buyCommissionRate: "",
      sellRate: "",
      sellCommissionRate: "",
      usdtAddressTRC20: "",
      usdtAddressBEP20: "",
      cliqAlias: "",
      cliqBankName: "",
      cliqAccountHolder: "",
      mobileWallet: "",
      walletType: "",
      walletHolderName: "",
    },
  });

  // On initial load (or refetch), populate fields with fetched settings
  useEffect(() => {
    if (settings) {
      form.setValue("buyRate", settings.buyRate);
      form.setValue("buyCommissionRate", settings.buyCommissionRate);
      form.setValue("sellRate", settings.sellRate);
      form.setValue("sellCommissionRate", settings.sellCommissionRate);
      form.setValue("usdtAddressTRC20", settings.usdtAddressTRC20);
      form.setValue("usdtAddressBEP20", settings.usdtAddressBEP20);
      form.setValue("cliqAlias", settings.cliqAlias);
      form.setValue("cliqBankName", settings.cliqBankName);
      form.setValue("cliqAccountHolder", settings.cliqAccountHolder);
      form.setValue("mobileWallet", settings.mobileWallet);
      form.setValue("walletType", settings.walletType);
      form.setValue("walletHolderName", settings.walletHolderName);
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation<PaymentSettings, Error, PaymentSettings>({
    mutationFn: async (data: PaymentSettings) => {
      const res = await apiRequest("POST", "/api/admin/settings/payment", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update settings");
      }
      return res.json();
    },
    onSuccess: (updatedSettings) => {
      // Update only the fields with the new values
      form.setValue("buyRate", updatedSettings.buyRate);
      form.setValue("buyCommissionRate", updatedSettings.buyCommissionRate);
      form.setValue("sellRate", updatedSettings.sellRate);
      form.setValue("sellCommissionRate", updatedSettings.sellCommissionRate);
      form.setValue("usdtAddressTRC20", updatedSettings.usdtAddressTRC20);
      form.setValue("usdtAddressBEP20", updatedSettings.usdtAddressBEP20);
      form.setValue("cliqAlias", updatedSettings.cliqAlias);
      form.setValue("cliqBankName", updatedSettings.cliqBankName);
      form.setValue("cliqAccountHolder", updatedSettings.cliqAccountHolder);
      form.setValue("mobileWallet", updatedSettings.mobileWallet);
      form.setValue("walletType", updatedSettings.walletType);
      form.setValue("walletHolderName", updatedSettings.walletHolderName);

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
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = useCallback(
    async (text: string, field: "cliqAlias" | "mobileWallet") => {
      try {
        await navigator.clipboard.writeText(text);
        setCopyingField(field);
        setTimeout(() => setCopyingField(null), 2000);
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
    },
    [toast]
  );

  const onSubmit = useCallback(
    (data: PaymentSettings) => {
      updateSettingsMutation.mutate(data);
    },
    [updateSettingsMutation]
  );

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Rate Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Exchange Rate Settings</CardTitle>
            <CardDescription>
              Configure buy and sell rates with their respective commission percentages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Buy Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="buyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buy Rate (JOD per USDT)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.005" min="0" {...field} />
                    </FormControl>
                    <FormDescription>
                      The rate at which users can buy USDT (e.g., 0.71 means 1 USDT = 0.71 JOD)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="buyCommissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buy Commission Rate</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.005" min="0" max="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Commission rate for buy orders (e.g., 0.02 means 2%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sell Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sellRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sell Rate (JOD per USDT)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.005" min="0" {...field} />
                    </FormControl>
                    <FormDescription>
                      The rate at which users can sell USDT (e.g., 0.69 means 1 USDT = 0.69 JOD)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellCommissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sell Commission Rate</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.005" min="0" max="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Commission rate for sell orders (e.g., 0.02 means 2%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        onClick={() => copyToClipboard(settings.cliqAlias, "cliqAlias")}
                      >
                        {copyingField === "cliqAlias" ? (
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
                        onClick={() => copyToClipboard(settings.mobileWallet, "mobileWallet")}
                      >
                        {copyingField === "mobileWallet" ? (
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
