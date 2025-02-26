import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTransactionSchema } from "@shared/schema";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Upload, Copy, Check, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

/** Helper calculation functions */
function calculateEquivalentAmount(
  amount: string,
  tradeType: "buy" | "sell",
  currencyBasis: "native" | "foreign",
  rate: number
): string {
  const num = Number(amount) || 0;
  if (tradeType === "buy") {
    // BUY scenario
    return currencyBasis === "foreign"
      ? (num * rate).toFixed(2) // user typed USDT => convert to JOD
      : (num / rate).toFixed(2); // user typed JOD => convert to USDT
  } else {
    // SELL scenario
    return currencyBasis === "foreign"
      ? (num / rate).toFixed(2) // user typed JOD => convert to USDT
      : (num * rate).toFixed(2); // user typed USDT => convert to JOD
  }
}

function calculateCommission(
  amount: string,
  tradeType: "buy" | "sell",
  currencyBasis: "native" | "foreign",
  rate: number,
  commission: number
): string {
  const commissionRate = commission / 100; // Convert percentage to decimal
  const num = Number(amount) || 0;

  if (tradeType === "buy") {
    // BUY
    if (currencyBasis === "foreign") {
      // user typed USDT => final is JOD + commission
      const jodAmount = num * rate;
      const commissionJOD = jodAmount * commissionRate;
      return commissionJOD.toFixed(2) + " JOD";
    } else {
      // user typed JOD => final is USDT - commission
      const baseUsdt = num / rate;
      const commissionUsdt = baseUsdt * commissionRate;
      return commissionUsdt.toFixed(2) + " USDT";
    }
  } else {
    // SELL
    if (currencyBasis === "foreign") {
      // user typed JOD => final is USDT + commission
      const baseUsdt = num / rate;
      const commissionUsdt = baseUsdt * commissionRate;
      return commissionUsdt.toFixed(2) + " USDT";
    } else {
      // user typed USDT => final is JOD - commission
      const baseJod = num * rate;
      const commissionJod = baseJod * commissionRate;
      return commissionJod.toFixed(2) + " JOD";
    }
  }
}

function calculateFinalAmount(
  amount: string,
  tradeType: "buy" | "sell",
  currencyBasis: "native" | "foreign",
  rate: number,
  commission: number
): string {
  const commissionRate = commission / 100; // Convert percentage to decimal
  const num = Number(amount) || 0;

  if (tradeType === "buy") {
    // BUY
    if (currencyBasis === "foreign") {
      // user typed USDT => total JOD = base + commission
      const jodAmount = num * rate;
      return (jodAmount * (1 + commissionRate)).toFixed(2);
    } else {
      // user typed JOD => total USDT = base - commission
      return ((num / rate) * (1 - commissionRate)).toFixed(2);
    }
  } else {
    // SELL
    if (currencyBasis === "foreign") {
      // user typed JOD => total USDT = base + commission
      const baseUsdt = num / rate;
      const commissionUSDT = baseUsdt * commissionRate;
      return (baseUsdt + commissionUSDT).toFixed(2);
    } else {
      // user typed USDT => total JOD = base - commission
      const baseJod = num * rate;
      const commissionJod = baseJod * commissionRate;
      return (baseJod - commissionJod).toFixed(2);
    }
  }
}

const tradeFormSchema = z.object({
  type: z.enum(["buy", "sell"]),
  amount: z.string()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number with up to 2 decimal places"),
  network: z.enum(["trc20", "bep20"]),
});

export default function TradeForm() {
  const { toast } = useToast();
  const { user, isLoading: isLoadingUser } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  /** For currency basis selection */
  const [currencyBasis, setCurrencyBasis] = useState<"native" | "foreign">("native");

  /** Single field to track which item is currently "copying" for the UI icon states. */
  const [copyingField, setCopyingField] = useState<null | string>(null);

  /** For the "Buy" scenario: either "cliq" or "wallet". */
  const [paymentMethod, setPaymentMethod] = useState<"cliq" | "wallet">("cliq");

  /** Query Payment Settings from the server */
  const { data: paymentSettings, isLoading: isLoadingSettings } = useQuery<{
    buyRate: string;
    buyCommissionPercentage: string;
    sellRate: string;
    sellCommissionPercentage: string;
    cliqAlias: string;
    mobileWallet: string;
    cliqBankName: string;
    cliqAccountHolder: string;
    walletType: string;
    walletHolderName: string;
    usdtAddressTRC20: string;
    usdtAddressBEP20: string;
  }>({
    queryKey: ["/api/settings/payment"],
    staleTime: 1000,
    retry: 3,
  });

  /** React Hook Form Setup */
  const form = useForm({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      type: "buy",
      amount: "",
      network: "trc20",
    },
  });

  // Store watched values in local constants
  const type = form.watch("type");
  const amount = form.watch("amount");
  const network = form.watch("network");

  // Get the appropriate rate and commission based on trade type, converting strings to numbers
  const currentRate = type === "buy"
    ? Number(paymentSettings?.buyRate || 0)
    : Number(paymentSettings?.sellRate || 0);
  const currentCommission = type === "buy"
    ? Number(paymentSettings?.buyCommissionPercentage || 0)
    : Number(paymentSettings?.sellCommissionPercentage || 0);

  // useMemo for calculations
  const equivalentAmount = useMemo(
    () => currentRate ? calculateEquivalentAmount(amount, type, currencyBasis, currentRate) : "0.00",
    [amount, type, currencyBasis, currentRate]
  );

  const commission = useMemo(
    () => (currentRate && currentCommission)
      ? calculateCommission(amount, type, currencyBasis, currentRate, currentCommission)
      : "0.00",
    [amount, type, currencyBasis, currentRate, currentCommission]
  );

  const finalAmount = useMemo(
    () => (currentRate && currentCommission)
      ? calculateFinalAmount(amount, type, currencyBasis, currentRate, currentCommission)
      : "0.00",
    [amount, type, currencyBasis, currentRate, currentCommission]
  );

  /** Copy text to clipboard with a single state for all fields */
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyingField(field);
      setTimeout(() => setCopyingField(null), 2000);
      toast({
        title: "Address copied",
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

  /** Reset upload progress when the file changes */
  useEffect(() => {
    setUploadProgress(0);
  }, [file]);

  /** Cleanup on unmount */
  useEffect(() => {
    return () => {
      setFile(null);
      setUploadProgress(0);
    };
  }, []);

  /** Handle file selection and validation */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const validTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG or PNG image",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
    }
    setFile(selectedFile);
  };

  /** Cleanup form data after successful submission */
  const cleanupForm = () => {
    form.reset();
    setFile(null);
    setUploadProgress(0);
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const tradeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await fetch("/api/trade", {
        method: "POST",
        body: formData,
        credentials: "include"
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to submit trade");
        }
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      cleanupForm();
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

  /** Label for whichever currency the user is currently entering */
  const getCurrentCurrencyLabel = () => {
    return type === "buy"
      ? currencyBasis === "native"
        ? "JOD"
        : "USDT"
      : currencyBasis === "native"
      ? "USDT"
      : "JOD";
  };

  /** Label for the "other" currency displayed as the equivalent */
  const getEquivalentCurrencyLabel = () => {
    return type === "buy"
      ? currencyBasis === "native"
        ? "USDT"
        : "JOD"
      : currencyBasis === "native"
      ? "JOD"
      : "USDT";
  };

  /** Final form submission handler */
  const onSubmit = async (values: z.infer<typeof tradeFormSchema>) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit trades",
        variant: "destructive",
      });
      return;
    }

    if (values.type === "buy" && !(user.cliqAlias || user.cliqNumber)) {
      toast({
        title: "CliQ details not set",
        description: "Please set either your CliQ alias or number in settings before buying",
        variant: "destructive",
      });
      return;
    }

    if (values.type === "sell" && !user.usdtAddress) {
      toast({
        title: "USDT wallet not set",
        description: "Please set your USDT wallet address in settings before selling",
        variant: "destructive",
      });
      return;
    }

    if (!file) {
      toast({
        title: "Missing payment proof",
        description: "Please upload your payment proof",
        variant: "destructive",
      });
      return;
    }

    try {
      // If the user typed the "foreign" currency, we use the already-converted 'equivalentAmount'
      const finalInputAmount = currencyBasis === "foreign" ? equivalentAmount : values.amount;

      const formData = new FormData();
      formData.append("type", values.type);
      formData.append("amount", finalInputAmount);
      formData.append("rate", currentRate.toString());
      formData.append("proofOfPayment", file);
      formData.append("network", values.network);

      // Add payment method for buy orders
      if (values.type === "buy") {
        formData.append("paymentMethod", paymentMethod);
      }

      await tradeMutation.mutateAsync(formData);

      // Clear form after successful submission
      form.reset();
      setFile(null);
      setUploadProgress(0);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }

    } catch (error) {
      console.error("Trade submission error:", error);
      toast({
        title: "Trade submission failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Basic checks
  const isLoading = isLoadingUser || isLoadingSettings;
  const hasUsdtAddress = user?.usdtAddress || false;
  const hasCliqSettings = user?.cliqAlias || user?.cliqNumber || false;
  const isUploading = tradeMutation.isPending && uploadProgress > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs
        defaultValue="buy"
        onValueChange={(value) => form.setValue("type", value)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy">Buy USDT</TabsTrigger>
          <TabsTrigger value="sell">Sell USDT</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {type === "sell" && !hasUsdtAddress && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      Please set your USDT wallet address in settings before
                      selling
                    </AlertDescription>
                  </Alert>
                )}
                {type === "buy" && !hasCliqSettings && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      Please set your CliQ account details in settings before
                      buying
                    </AlertDescription>
                  </Alert>
                )}

                {/* Amount Field */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <div className="space-y-3">
                        <RadioGroup
                          value={currencyBasis}
                          onValueChange={(value: "native" | "foreign") =>
                            setCurrencyBasis(value)
                          }
                          className="flex flex-col space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="native" />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">
                              Enter in {type === "buy" ? "JOD" : "USDT"}
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="foreign" />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">
                              Enter in {type === "buy" ? "USDT" : "JOD"}
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>

                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            placeholder={`Enter amount in ${getCurrentCurrencyLabel()}`}
                            className="text-base"
                          />
                        </FormControl>
                      </div>
                      <FormDescription className="text-xs">
                        Enter the amount you want to {type} in{" "}
                        {getCurrentCurrencyLabel()}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Summary Card */}
                <Card className="p-3 sm:p-4">
                  <div className="flex flex-wrap justify-between gap-2 mb-2 text-sm">
                    <span>Exchange Rate</span>
                    <span className="font-mono">
                      1 USDT = {currentRate ? currentRate.toFixed(2) : "0.00"} JOD
                    </span>
                  </div>
                  {amount && (
                    <>
                      <div className="flex flex-wrap justify-between gap-2 mb-2 text-sm">
                        <span>Base Amount</span>
                        <span className="font-mono">
                          {equivalentAmount} {getEquivalentCurrencyLabel()}
                        </span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2 mb-2 text-xs sm:text-sm text-muted-foreground">
                        <span>Commission ({currentCommission ? currentCommission.toFixed(2) : "0.00"}%)</span>
                        <span className="font-mono">{commission}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2 pt-2 border-t text-sm font-medium">
                        <span>
                          {type === "buy"
                            ? currencyBasis === "foreign"
                              ? "Total to Pay"
                              : "Total to Receive"
                            : currencyBasis === "foreign"
                            ? "Total to Pay"
                            : "Total to Receive"}
                        </span>
                        <span className="font-mono">
                          {finalAmount} {getEquivalentCurrencyLabel()}
                        </span>
                      </div>
                    </>
                  )}
                </Card>

                {/* Payment Method / Network Selection */}
                <Alert>
                  <AlertDescription className="text-xs sm:text-sm">
                    {type === "buy" ? (
                      <>
                        {/* Buy Scenario */}
                        <p className="mb-2">
                          Choose your preferred payment method:
                        </p>
                        <RadioGroup
                          defaultValue="cliq"
                          className="mb-4 space-y-3"
                          value={paymentMethod}
                          onValueChange={(value: "cliq" | "wallet") =>
                            setPaymentMethod(value)
                          }
                        >
                          {paymentSettings?.cliqAlias && (
                            <div className="space-y-2">
                              <FormItem className="flex items-center space-x-3">
                                <FormControl>
                                  <RadioGroupItem value="cliq" />
                                </FormControl>
                                <FormLabel className="font-medium">
                                  CliQ Payment
                                </FormLabel>
                              </FormItem>
                              {paymentMethod === "cliq" && (
                                <div className="ml-7 text-xs space-y-1 bg-muted/50 p-2 sm:p-3 rounded-md">
                                  <div className="flex items-center justify-between">
                                    <p className="truncate mr-2">
                                      <span className="text-muted-foreground">
                                        Cliq Alias:
                                      </span>{" "}
                                      {paymentSettings.cliqAlias}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={() =>
                                        copyToClipboard(
                                          paymentSettings.cliqAlias,
                                          "cliqAlias",
                                        )
                                      }
                                    >
                                      {copyingField === "cliqAlias" ? (
                                        <Check className="h-4 w-4" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                  <p>
                                    <span className="text-muted-foreground">
                                      Bank:
                                    </span>{" "}
                                    {paymentSettings.cliqBankName}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">
                                      Account Holder:
                                    </span>{" "}
                                    {paymentSettings.cliqAccountHolder}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                          {paymentSettings?.mobileWallet && (
                            <div className="space-y-2">
                              <FormItem className="flex items-center space-x-3">
                                <FormControl>
                                  <RadioGroupItem value="wallet" />
                                </FormControl>
                                <FormLabel className="font-medium">
                                  Mobile Wallet
                                </FormLabel>
                              </FormItem>
                              {paymentMethod === "wallet" && (
                                <div className="ml-7 text-xs space-y-1 bg-muted/50 p-2 sm:p-3 rounded-md">
                                  <div className="flex items-center justify-between">
                                    <p>
                                      <span className="text-muted-foreground">
                                        Number:
                                      </span>{" "}
                                      {paymentSettings.mobileWallet}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={() =>
                                        copyToClipboard(
                                          paymentSettings.mobileWallet,
                                          "mobileWallet",
                                        )
                                      }
                                    >
                                      {copyingField === "mobileWallet" ? (
                                        <Check className="h-4 w-4" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                  <p>
                                    <span className="text-muted-foreground">
                                      Wallet Type:
                                    </span>{" "}
                                    {paymentSettings.walletType}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">
                                      Holder Name:
                                    </span>{" "}
                                    {paymentSettings.walletHolderName}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground">
                          Please send {amount} JOD using your selected payment
                          method and upload the proof below.
                          <br />
                          You will receive {finalAmount} USDT after approval.
                        </p>
                      </>
                    ) : (
                      <>
                        {/* Sell Scenario */}
                        <p className="mb-4 font-medium">
                          Select USDT network for payment:
                        </p>
                        <div className="space-y-4 sm:space-y-6">
                          <FormField
                            control={form.control}
                            name="network"
                            render={({ field }) => (
                              <FormItem className="space-y-4 sm:space-y-6">
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="space-y-4 sm:space-y-6"
                                  >
                                    <div className="space-y-3">
                                      <div className="flex items-center space-x-3">
                                        <RadioGroupItem
                                          value="trc20"
                                          id="trc20"
                                        />
                                        <FormLabel
                                          htmlFor="trc20"
                                          className="font-medium"
                                        >
                                          TRC20 Network
                                        </FormLabel>
                                      </div>
                                      {network === "trc20" && (
                                        <div className="ml-7 text-xs bg-muted/50 p-2 sm:p-3 rounded-md">
                                          {!paymentSettings?.usdtAddressTRC20 ? (
                                            <div className="text-muted-foreground">
                                              TRC20 address not set in admin
                                              settings
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-between">
                                              <p className="font-mono break-all mr-2">
                                                {
                                                  paymentSettings.usdtAddressTRC20
                                                }
                                              </p>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0"
                                                onClick={() =>
                                                  copyToClipboard(
                                                    paymentSettings.usdtAddressTRC20,
                                                    "trc20",
                                                  )
                                                }
                                              >
                                                {copyingField === "trc20" ? (
                                                  <Check className="h-4 w-4" />
                                                ) : (
                                                  <Copy className="h-4 w-4" />
                                                )}
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-3">
                                      <div className="flex items-center space-x-3">
                                        <RadioGroupItem
                                          value="bep20"
                                          id="bep20"
                                        />
                                        <FormLabel
                                          htmlFor="bep20"
                                          className="font-medium"
                                        >
                                          BEP20 Network
                                        </FormLabel>
                                      </div>
                                      {network === "bep20" && (
                                        <div className="ml-7 text-xs bg-muted/50 p-2 sm:p-3 rounded-md">
                                          {!paymentSettings?.usdtAddressBEP20 ? (
                                            <div className="text-muted-foreground">
                                              BEP20 address not set in admin
                                              settings
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-between">
                                              <p className="font-mono break-all mr-2">
                                                {
                                                  paymentSettings.usdtAddressBEP20
                                                }
                                              </p>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0"
                                                onClick={() =>
                                                  copyToClipboard(
                                                    paymentSettings.usdtAddressBEP20,
                                                    "bep20",
                                                  )
                                                }
                                              >
                                                {copyingField === "bep20" ? (
                                                  <Check className="h-4 w-4" />
                                                ) : (
                                                  <Copy className="h-4 w-4" />
                                                )}
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 sm:mt-6">
                          Please send {amount} USDT to the selected network
                          address and upload the transaction proof below.
                          <br />
                          You will receive {finalAmount} JOD after approval.
                        </p>
                      </>
                    )}
                  </AlertDescription>
                </Alert>

                {/* File Upload for Payment Proof */}
                <div>
                  <FormLabel>Payment Proof</FormLabel>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="mt-2 text-sm"
                    disabled={isUploading}
                  />
                  <FormDescription className="text-xs mt-1">
                    Upload a screenshot of your payment (JPG or PNG, max 5MB)
                  </FormDescription>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-xs text-center text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full mt-6"
                  disabled={
                    tradeMutation.isPending ||
                    isLoading ||
                    (type === "sell" && !hasUsdtAddress) ||
                    (type === "buy" && !hasCliqSettings)
                  }
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
              </>
            )}
          </form>
        </Form>
      </Tabs>
    </div>
  );
}