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
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

/** Helper calculation functions */
function calculateEquivalentAmount(
  amount: string,
  tradeType: "buy" | "sell",
  currencyBasis: "native" | "foreign",
  rate: number,
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
  commission: number,
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
  commission: number,
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

const tradeFormSchema = z
  .object({
    type: z.enum(["buy", "sell"]),
    amount: z
      .string()
      .min(1, "Amount is required")
      .regex(
        /^\d+(\.\d{1,2})?$/,
        "Amount must be a valid number with up to 2 decimal places",
      ),
    network: z.enum(["trc20", "bep20"]).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "sell" && !data.network) {
        return false;
      }
      return true;
    },
    {
      message: "Network is required for sell orders",
      path: ["network"],
    },
  );

export default function TradeForm() {
  const { toast } = useToast();
  const { user, isLoading: isLoadingUser } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  /** For currency basis selection */
  const [currencyBasis, setCurrencyBasis] = useState<"native" | "foreign">(
    "native",
  );

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
      network: undefined,
    },
  });

  // Store watched values in local constants
  const type = form.watch("type");
  const amount = form.watch("amount");
  const network = form.watch("network");

  // Set default network when switching to sell type
  useEffect(() => {
    if (type === "sell" && !network) {
      form.setValue("network", "trc20"); // Set a default network for sell orders
    }
  }, [type, network, form]);

  // Get the appropriate rate and commission based on trade type, converting strings to numbers
  const currentRate =
    type === "buy"
      ? Number(paymentSettings?.buyRate || 0)
      : Number(paymentSettings?.sellRate || 0);
  const currentCommission =
    type === "buy"
      ? Number(paymentSettings?.buyCommissionPercentage || 0)
      : Number(paymentSettings?.sellCommissionPercentage || 0);

  // useMemo for calculations
  const equivalentAmount = useMemo(
    () =>
      currentRate
        ? calculateEquivalentAmount(amount, type, currencyBasis, currentRate)
        : "0.00",
    [amount, type, currencyBasis, currentRate],
  );

  const commission = useMemo(
    () =>
      currentRate && currentCommission
        ? calculateCommission(
            amount,
            type,
            currencyBasis,
            currentRate,
            currentCommission,
          )
        : "0.00",
    [amount, type, currencyBasis, currentRate, currentCommission],
  );

  const finalAmount = useMemo(
    () =>
      currentRate && currentCommission
        ? calculateFinalAmount(
            amount,
            type,
            currencyBasis,
            currentRate,
            currentCommission,
          )
        : "0.00",
    [amount, type, currencyBasis, currentRate, currentCommission],
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
        credentials: "include",
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
        description:
          "Please set either your CliQ alias or number in settings before buying",
        variant: "destructive",
      });
      return;
    }

    if (values.type === "sell" && !user.usdtAddress) {
      toast({
        title: "USDT wallet not set",
        description:
          "Please set your CliQ account details in settings before selling",
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
      const finalInputAmount =
        currencyBasis === "foreign" ? equivalentAmount : values.amount;
      const formData = new FormData();
      formData.append("type", values.type);
      formData.append("amount", finalInputAmount);
      formData.append("rate", currentRate.toString());
      formData.append("proofOfPayment", file);

      // For sell orders, network is required
      if (values.type === "sell") {
        if (!values.network) {
          toast({
            title: "Network required",
            description: "Please select a network for sell orders",
            variant: "destructive",
          });
          return;
        }
        formData.append("network", values.network);
        console.log("Sending sell order with network:", values.network);
      }

      // For buy orders, include payment method
      if (values.type === "buy") {
        formData.append("paymentMethod", paymentMethod);
      }

      await tradeMutation.mutateAsync(formData);
    } catch (error) {
      console.error("Trade submission error:", error);
      toast({
        title: "Trade submission failed",
        description:
          error instanceof Error ? error.message : "An error occurred",
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
    <div className="space-y-8">
      {/* Trade Options Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Trade Options</h2>
        <Tabs
          defaultValue="buy"
          onValueChange={(value) => form.setValue("type", value)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 px-1 py-[3px] bg-muted/50 rounded-lg">
            <TabsTrigger
              value="buy"
              className="text-base rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
            >
              Buy USDT
            </TabsTrigger>
            <TabsTrigger
              value="sell"
              className="text-base rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
            >
              Sell USDT
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {type === "buy"
                ? "You're buying USDT with JOD"
                : "You're selling USDT for JOD"}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 mt-8">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Warning Alerts */}
                  {type === "sell" && !hasUsdtAddress && (
                    <Alert className="bg-destructive/10 text-destructive border-none mb-8">
                      <AlertDescription>
                        Please set your USDT wallet address in settings before selling
                      </AlertDescription>
                    </Alert>
                  )}
                  {type === "buy" && !hasCliqSettings && (
                    <Alert className="bg-destructive/10 text-destructive border-none mb-8">
                      <AlertDescription>
                        Please set your CliQ account details in settings before buying
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Amount & Currency Section */}
                  <div className="space-y-8">
                    <h2 className="text-xl font-semibold tracking-tight">Amount & Currency</h2>
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem className="space-y-6">
                            <RadioGroup
                              value={currencyBasis}
                              onValueChange={(value: "native" | "foreign") =>
                                setCurrencyBasis(value)
                              }
                              className="flex flex-col space-y-3 sm:flex-row sm:space-x-6 sm:space-y-0"
                            >
                              <FormItem className="flex items-center space-x-3">
                                <FormControl>
                                  <RadioGroupItem value="native" />
                                </FormControl>
                                <FormLabel className="text-sm font-medium">
                                  Enter in {type === "buy" ? "JOD" : "USDT"}
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3">
                                <FormControl>
                                  <RadioGroupItem value="foreign" />
                                </FormControl>
                                <FormLabel className="text-sm font-medium">
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
                                className="text-base p-6"
                              />
                            </FormControl>
                            <FormDescription className="text-sm text-muted-foreground">
                              Enter the amount you would like to {type === "buy" ? "purchase" : "sell"}
                            </FormDescription>
                            <FormMessage className="text-sm" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Exchange Rate Summary */}
                    <Card className="border bg-card/50">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex flex-wrap justify-between gap-3">
                          <span className="text-sm font-medium">Exchange Rate</span>
                          <span className="text-sm font-mono">
                            1 USDT = {currentRate ? currentRate.toFixed(2) : "0.00"} JOD
                          </span>
                        </div>
                        {amount && (
                          <>
                            <div className="flex flex-wrap justify-between gap-3">
                              <span className="text-sm font-medium">Base Amount</span>
                              <span className="text-sm font-mono">
                                {equivalentAmount} {getEquivalentCurrencyLabel()}
                              </span>
                            </div>
                            <div className="flex flex-wrap justify-between gap-3 text-muted-foreground">
                              <span className="text-sm">
                                Commission ({currentCommission ? currentCommission.toFixed(2) : "0.00"}%)
                              </span>
                              <span className="text-sm font-mono">{commission}</span>
                            </div>
                            <div className="flex flex-wrap justify-between gap-3 pt-3 border-t">
                              <span className="text-sm font-medium">
                                {type === "buy"
                                  ? currencyBasis === "foreign"
                                    ? "Total to Pay"
                                    : "Total to Receive"
                                  : currencyBasis === "foreign"
                                  ? "Total to Pay"
                                  : "Total to Receive"}
                              </span>
                              <span className="text-base font-medium font-mono">
                                {finalAmount} {getEquivalentCurrencyLabel()}
                              </span>
                            </div>

                            {/* Summary Message */}
                            <div className="mt-4 pt-3 border-t text-center">
                              <p className="text-sm">
                                {type === "buy" ? (
                                  currencyBasis === "foreign" ? (
                                    <>
                                      You will pay <span className="font-medium">{finalAmount} JOD</span> to receive{" "}
                                      <span className="font-medium">{amount} USDT</span>
                                    </>
                                  ) : (
                                    <>
                                      You will receive <span className="font-medium">{finalAmount} USDT</span> for{" "}
                                      <span className="font-medium">{amount} JOD</span>
                                    </>
                                  )
                                ) : currencyBasis === "foreign" ? (
                                  <>
                                    You will receive <span className="font-medium">{finalAmount} USDT</span> for{" "}
                                    <span className="font-medium">{amount} JOD</span>
                                  </>
                                ) : (
                                  <>
                                    You will receive <span className="font-medium">{finalAmount} JOD</span> for{" "}
                                    <span className="font-medium">{amount} USDT</span>
                                  </>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Includes {currentCommission}% commission fee
                              </p>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Network Selection for Sell */}
                  {type === "sell" && (
                    <div className="space-y-8">
                      <h2 className="text-xl font-semibold tracking-tight">Network Selection</h2>
                      <FormField
                        control={form.control}
                        name="network"
                        render={({ field }) => (
                          <FormItem className="space-y-6">
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="space-y-4"
                              >
                                <Card className="border bg-card/50">
                                  <CardContent className="p-6">
                                    <div className="space-y-4">
                                      <FormItem className="flex items-center space-x-3">
                                        <FormControl>
                                          <RadioGroupItem value="trc20" />
                                        </FormControl>
                                        <FormLabel className="text-sm font-medium">
                                          TRC20 Network
                                        </FormLabel>
                                      </FormItem>
                                      {field.value === "trc20" && (
                                        <div className="ml-7 text-sm bg-muted/50 p-4 rounded-md">
                                          <div className="flex items-center justify-between">
                                            <p className="font-mono break-all mr-2">
                                              {paymentSettings?.usdtAddressTRC20}
                                            </p>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="shrink-0"
                                              onClick={() =>
                                                copyToClipboard(
                                                  paymentSettings?.usdtAddressTRC20 || "",
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
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card className="border bg-card/50">
                                  <CardContent className="p-6">
                                    <div className="space-y-4">
                                      <FormItem className="flex items-center space-x-3">
                                        <FormControl>
                                          <RadioGroupItem value="bep20" />
                                        </FormControl>
                                        <FormLabel className="text-sm font-medium">
                                          BEP20 Network
                                        </FormLabel>
                                      </FormItem>
                                      {field.value === "bep20" && (
                                        <div className="ml-7 text-sm bg-muted/50 p-4 rounded-md">
                                          <div className="flex items-center justify-between">
                                            <p className="font-mono break-all mr-2">
                                              {paymentSettings?.usdtAddressBEP20}
                                            </p>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="shrink-0"
                                              onClick={() =>
                                                copyToClipboard(
                                                  paymentSettings?.usdtAddressBEP20 || "",
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
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </RadioGroup>
                            </FormControl>
                            <FormDescription className="text-sm text-muted-foreground">
                              Select the blockchain network for your USDT transaction
                            </FormDescription>
                            <FormMessage className="text-sm" />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Payment Method Selection for Buy */}
                  {type === "buy" && (
                    <div className="space-y-8">
                      <h2 className="text-xl font-semibold tracking-tight">Payment Method</h2>
                      <Card className="border bg-card/50">
                        <CardContent className="p-6">
                          <RadioGroup
                            defaultValue="cliq"
                            className="space-y-6"
                            value={paymentMethod}
                            onValueChange={(value: "cliq" | "wallet") =>
                              setPaymentMethod(value)
                            }
                          >
                            {paymentSettings?.cliqAlias && (
                              <div className="space-y-4">
                                <FormItem className="flex items-center space-x-3">
                                  <FormControl>
                                    <RadioGroupItem value="cliq" />
                                  </FormControl>
                                  <FormLabel className="text-sm font-medium">
                                    CliQ Payment
                                  </FormLabel>
                                </FormItem>
                                {paymentMethod === "cliq" && (
                                  <div className="ml-7 text-sm bg-muted/50 p-4 rounded-md space-y-3">
                                    <div className="flex items-center justify-between">
                                      <p className="truncate mr-2">
                                        <span className="text-muted-foreground">
                                          Cliq Alias:
                                        </span>{" "}
                                        {paymentSettings.cliqAlias}
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="shrink-0"
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
                              <div className="space-y-4">
                                <FormItem className="flex items-center space-x-3">
                                  <FormControl>
                                    <RadioGroupItem value="wallet" />
                                  </FormControl>
                                  <FormLabel className="text-sm font-medium">
                                    Mobile Wallet
                                  </FormLabel>
                                </FormItem>
                                {paymentMethod === "wallet" && (
                                  <div className="ml-7 text-sm bg-muted/50 p-4 rounded-md space-y-3">
                                    <div className="flex items-center justify-between">
                                      <p>
                                        <span className="text-muted-foreground">
                                          Number:
                                        </span>{" "}
                                        {paymentSettings.mobileWallet}
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="shrink-0"
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
                        </CardContent>
                      </Card>
                      <FormDescription className="text-sm text-muted-foreground">
                        Choose how you'd like to make your payment
                      </FormDescription>
                    </div>
                  )}

                  {/* Payment Proof Upload Section */}
                  <div className="space-y-8">
                    <h2 className="text-xl font-semibold tracking-tight">Payment Proof</h2>
                    <Card className="border bg-card/50">
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={handleFileChange}
                            className="hidden"
                            id="payment-proof"
                          />
                          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => document.getElementById("payment-proof")?.click()}
                          >
                            <Upload className="h-10 w-10 mb-4 text-muted-foreground" />
                            <p className="text-base text-center">
                              Upload payment confirmation
                              <br />
                              <span className="text-sm text-muted-foreground mt-1 block">
                                Click to upload a JPG or PNG image (max 5MB)
                              </span>
                            </p>
                          </div>
                          {file && (
                            <div className="text-sm">
                              <p className="font-medium mb-2">Selected file:</p>
                              <p className="text-muted-foreground">{file.name}</p>
                              {uploadProgress > 0 && (
                                <Progress value={uploadProgress} className="mt-3" />
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 transition-colors duration-200"
                      disabled={isUploading || tradeMutation.isPending || !amount}
                    >
                      {isUploading ? (
                        <>
                          <Upload className="mr-2 h-5 w-5 animate-bounce" />
                          Uploading Payment Proof...
                        </>
                      ) : tradeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing {type === "buy" ? "Buy" : "Sell"} Order...
                        </>
                      ) : (
                        <>
                          Submit {type === "buy" ? "Buy" : "Sell"} Order
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Form>
        </Tabs>
      </div>
    </div>
  );
}