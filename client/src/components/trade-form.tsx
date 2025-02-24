import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

const MOCK_RATE = 0.71; // 1 USDT = 0.71 JOD
const COMMISSION_RATE = 0.02; // 2% commission placeholder

export default function TradeForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currencyBasis, setCurrencyBasis] = useState<"native" | "foreign">("native");

  const { data: paymentSettings } = useQuery<{ cliqAlias: string; mobileWallet: string; cliqBankName: string; cliqAccountHolder: string; walletType: string; walletHolderName: string; usdtAddressTRC20: string; usdtAddressBEP20: string }>({
    queryKey: ["/api/settings/payment"],
  });

  const form = useForm({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "buy",
      amount: "",
      rate: MOCK_RATE.toString(),
      network: "trc20"
    }
  });

  useEffect(() => {
    setUploadProgress(0);
  }, [file]);

  useEffect(() => {
    return () => {
      setFile(null);
      setUploadProgress(0);
    };
  }, []);

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

  const cleanupForm = () => {
    form.reset();
    setFile(null);
    setUploadProgress(0);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const tradeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const xhr = new XMLHttpRequest();
      let aborted = false;

      const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          aborted = true;
          xhr.abort();
          reject(new Error("Upload timed out"));
        }, 30000);

        xhr.upload.addEventListener("progress", (event) => {
          if (aborted) return;
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          clearTimeout(timeout);
          if (aborted) return;

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(new Error("Invalid response from server"));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.message || "Trade submission failed"));
            } catch (e) {
              reject(new Error("Trade submission failed"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          clearTimeout(timeout);
          if (aborted) return;
          reject(new Error("Network error occurred"));
        });

        xhr.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Upload was cancelled"));
        });

        xhr.open("POST", "/api/trade");
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      return promise;
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

  const calculateEquivalentAmount = (amount: string) => {
    const num = Number(amount) || 0;
    const type = form.watch("type");
    const isForeignCurrency = currencyBasis === "foreign";

    if (type === "buy") {
      return isForeignCurrency ? (num * MOCK_RATE).toFixed(2) : (num / MOCK_RATE).toFixed(2);
    } else {
      return isForeignCurrency ? (num / MOCK_RATE).toFixed(2) : (num * MOCK_RATE).toFixed(2);
    }
  };

  const calculateCommission = (amount: string) => {
    const num = Number(amount) || 0;
    return (num * COMMISSION_RATE).toFixed(2);
  };

  const calculateFinalAmount = (amount: string) => {
    const num = Number(amount) || 0;
    const equivalentNum = Number(calculateEquivalentAmount(amount)) || 0;
    const type = form.watch("type");

    if (type === "buy") {
      return currencyBasis === "foreign"
        ? (equivalentNum * (1 + COMMISSION_RATE)).toFixed(2)
        : (equivalentNum * (1 - COMMISSION_RATE)).toFixed(2);
    } else {
      return currencyBasis === "foreign"
        ? (equivalentNum * (1 + COMMISSION_RATE)).toFixed(2)
        : (equivalentNum * (1 - COMMISSION_RATE)).toFixed(2);
    }
  };

  const getCurrentCurrencyLabel = () => {
    const type = form.watch("type");
    if (type === "buy") {
      return currencyBasis === "native" ? "JOD" : "USDT";
    } else {
      return currencyBasis === "native" ? "USDT" : "JOD";
    }
  };

  const getEquivalentCurrencyLabel = () => {
    const type = form.watch("type");
    if (type === "buy") {
      return currencyBasis === "native" ? "USDT" : "JOD";
    } else {
      return currencyBasis === "native" ? "JOD" : "USDT";
    }
  };

  const onSubmit = (values: any) => {
    if (values.type === "buy" && !user?.usdtAddress) {
      toast({
        title: "USDT wallet not set",
        description: "Please set your USDT wallet address in settings before buying",
        variant: "destructive",
      });
      return;
    }

    if (values.type === "sell" && !(user?.cliqAlias || user?.cliqNumber)) {
      toast({
        title: "CliQ details not set",
        description: "Please set your CliQ account details in settings before selling",
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

    const formData = new FormData();
    formData.append("type", values.type);

    const amount = currencyBasis === "foreign" ?
      calculateEquivalentAmount(values.amount) :
      values.amount;

    formData.append("amount", amount);
    formData.append("rate", values.rate.toString());
    formData.append("proofOfPayment", file);
    formData.append("network", values.network);

    tradeMutation.mutate(formData);
  };

  const isUploading = tradeMutation.isPending && uploadProgress > 0;
  const type = form.watch("type");
  const amount = form.watch("amount");

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs defaultValue="buy" onValueChange={(value) => form.setValue("type", value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy">Buy USDT</TabsTrigger>
          <TabsTrigger value="sell">Sell USDT</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 mt-4">
            {type === "buy" && !user?.usdtAddress && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  Please set your USDT wallet address in settings before buying
                </AlertDescription>
              </Alert>
            )}
            {type === "sell" && !(user?.cliqAlias || user?.cliqNumber) && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  Please set your CliQ account details in settings before selling
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <div className="space-y-3 sm:space-y-4">
                    <RadioGroup
                      value={currencyBasis}
                      onValueChange={(value: "native" | "foreign") => setCurrencyBasis(value)}
                      className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
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
                    Enter the amount you want to {form.watch("type")} in {getCurrentCurrencyLabel()}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Card className="p-3 sm:p-4">
              <div className="flex justify-between mb-2 text-sm">
                <span>Exchange Rate</span>
                <span>1 USDT = {MOCK_RATE} JOD</span>
              </div>
              {amount && (
                <>
                  <div className="flex justify-between mb-2 text-sm">
                    <span>Base Amount</span>
                    <span className="font-mono">
                      {calculateEquivalentAmount(amount)} {getEquivalentCurrencyLabel()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2 text-xs sm:text-sm text-muted-foreground">
                    <span>Commission (2%)</span>
                    <span className="font-mono">
                      {calculateCommission(currencyBasis === "foreign" ? calculateEquivalentAmount(amount) : amount)} {getCurrentCurrencyLabel()}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t text-sm">
                    <span>
                      {type === "buy"
                        ? (currencyBasis === "foreign" ? "Total to Pay" : "Total to Receive")
                        : (currencyBasis === "foreign" ? "Total to Pay" : "Total to Receive")}
                    </span>
                    <span className="font-mono">
                      {calculateFinalAmount(amount)} {getEquivalentCurrencyLabel()}
                    </span>
                  </div>
                </>
              )}
            </Card>

            <Alert>
              <AlertDescription className="text-xs sm:text-sm">
                {form.watch("type") === "buy" ? (
                  <>
                    <p className="mb-2">Choose your preferred payment method:</p>
                    <RadioGroup defaultValue="cliq" className="mb-4 space-y-3">
                      {paymentSettings?.cliqAlias && (
                        <div className="space-y-2">
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="cliq" />
                            </FormControl>
                            <FormLabel className="font-medium">CliQ Payment</FormLabel>
                          </FormItem>
                          <div className="ml-7 text-xs space-y-1 bg-muted/50 p-2 rounded-md">
                            <p><span className="text-muted-foreground">CliQ Alias:</span> {paymentSettings.cliqAlias}</p>
                            <p><span className="text-muted-foreground">Bank:</span> {paymentSettings.cliqBankName}</p>
                            <p><span className="text-muted-foreground">Account Holder:</span> {paymentSettings.cliqAccountHolder}</p>
                          </div>
                        </div>
                      )}
                      {paymentSettings?.mobileWallet && (
                        <div className="space-y-2">
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <RadioGroupItem value="wallet" />
                            </FormControl>
                            <FormLabel className="font-medium">Mobile Wallet</FormLabel>
                          </FormItem>
                          <div className="ml-7 text-xs space-y-1 bg-muted/50 p-2 rounded-md">
                            <p><span className="text-muted-foreground">Number:</span> {paymentSettings.mobileWallet}</p>
                            <p><span className="text-muted-foreground">Wallet Type:</span> {paymentSettings.walletType}</p>
                            <p><span className="text-muted-foreground">Holder Name:</span> {paymentSettings.walletHolderName}</p>
                          </div>
                        </div>
                      )}
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">
                      Please send {form.watch("amount")} JOD using your selected payment method and upload the proof below.
                      <br />
                      You will receive {calculateFinalAmount(form.watch("amount"))} USDT after approval.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="space-y-4 mb-4">
                      <h3 className="text-sm font-medium mb-2">Select USDT network for payment:</h3>
                      <FormField
                        control={form.control}
                        name="network"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="space-y-4"
                              >
                                <div className="space-y-2">
                                  <FormItem className="flex items-center space-x-3">
                                    <FormControl>
                                      <RadioGroupItem value="trc20" />
                                    </FormControl>
                                    <FormLabel htmlFor="trc20" className="font-medium">TRC20 Network</FormLabel>
                                  </FormItem>
                                  {paymentSettings?.usdtAddressTRC20 && (
                                    <div className="ml-7 text-xs space-y-1 bg-muted/50 p-2 rounded-md">
                                      <p className="font-mono break-all">{paymentSettings.usdtAddressTRC20}</p>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <FormItem className="flex items-center space-x-3">
                                    <FormControl>
                                      <RadioGroupItem value="bep20" />
                                    </FormControl>
                                    <FormLabel htmlFor="bep20" className="font-medium">BEP20 Network</FormLabel>
                                  </FormItem>
                                  {paymentSettings?.usdtAddressBEP20 && (
                                    <div className="ml-7 text-xs space-y-1 bg-muted/50 p-2 rounded-md">
                                      <p className="font-mono break-all">{paymentSettings.usdtAddressBEP20}</p>
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
                    <p className="text-xs text-muted-foreground">
                      Please send {form.watch("amount")} USDT to the selected network address and upload the transaction proof below.
                      <br />
                      You will receive {calculateFinalAmount(form.watch("amount"))} JOD after approval.
                    </p>
                  </>
                )}
              </AlertDescription>
            </Alert>

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
              className="w-full mt-6"
              disabled={tradeMutation.isPending ||
                (form.watch("type") === "buy" && !user?.usdtAddress) ||
                (form.watch("type") === "sell" && !(user?.cliqAlias || user?.cliqNumber))}
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
    </div>
  );
}