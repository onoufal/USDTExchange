import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserWalletSchema, type UpdateUserWallet } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertCircle } from "lucide-react";

export default function WalletSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const form = useForm<UpdateUserWallet>({
    resolver: zodResolver(updateUserWalletSchema.extend({
      usdtAddress: updateUserWalletSchema.shape.usdtAddress
        .min(30, "Your USDT address seems too short. Please check and try again.")
        .max(50, "Your USDT address seems too long. Please verify it's correct.")
        .regex(/^[a-zA-Z0-9]+$/, "USDT addresses can only contain letters and numbers."),
    })),
    defaultValues: {
      usdtAddress: user?.usdtAddress || "",
      usdtNetwork: user?.usdtNetwork as "tron" | "bep20" || "tron"
    },
    mode: "onChange"
  });

  const updateWalletMutation = useMutation({
    mutationFn: async (data: UpdateUserWallet) => {
      const res = await apiRequest("POST", "/api/settings/wallet", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update wallet settings");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Settings Saved Successfully",
        description: "Your USDT wallet details have been updated and are ready to use.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to Save Changes",
        description: error.message || "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card 
      className={`
        border bg-card shadow-sm w-full 
        transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
    >
      <CardHeader className="space-y-2 border-b bg-muted/50 px-4 sm:px-6 py-4">
        <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">USDT Wallet Settings</CardTitle>
        <CardDescription className="text-sm sm:text-base text-muted-foreground">
          Configure your USDT wallet address to receive cryptocurrency from buy orders. Choose your preferred network and enter your wallet details below.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => updateWalletMutation.mutate(data))} className="space-y-6 sm:space-y-8">
            <FormField
              control={form.control}
              name="usdtNetwork"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-semibold">Network Type</FormLabel>
                    <FormDescription className="text-sm text-muted-foreground">
                      Select the blockchain network you'll use for receiving USDT. This cannot be changed for individual transactions.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid gap-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem 
                            value="tron" 
                            className="h-5 w-5 border-2 transition-all duration-200 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-offset-2" 
                          />
                        </FormControl>
                        <FormLabel className="text-base font-medium leading-none cursor-pointer select-none">
                          Tron (TRC20)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem 
                            value="bep20" 
                            className="h-5 w-5 border-2 transition-all duration-200 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-offset-2" 
                          />
                        </FormControl>
                        <FormLabel className="text-base font-medium leading-none cursor-pointer select-none">
                          BNB Smart Chain (BEP20)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="flex items-center gap-2 text-sm font-medium text-destructive animate-in fade-in-50">
                    {form.formState.errors.usdtNetwork?.message && (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {form.formState.errors.usdtNetwork?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="usdtAddress"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-semibold">Wallet Address</FormLabel>
                    <FormDescription className="text-sm text-muted-foreground">
                      Enter your USDT wallet address carefully. Double-check to ensure it matches your selected network.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Input 
                      placeholder="Enter your USDT wallet address for receiving payments" 
                      {...field}
                      className={`
                        h-11 text-base font-mono
                        transition-all duration-200
                        hover:border-input focus-visible:ring-2 focus-visible:ring-offset-2
                        ${form.formState.errors.usdtAddress ? "border-destructive" : ""}
                        transform-gpu hover:-translate-y-[1px]
                      `}
                    />
                  </FormControl>
                  <FormMessage className="flex items-center gap-2 text-sm font-medium text-destructive animate-in fade-in-50">
                    {form.formState.errors.usdtAddress?.message && (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {form.formState.errors.usdtAddress?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            <div className="pt-4 border-t">
              <Button 
                type="submit" 
                className={`
                  w-full h-11 text-base font-medium 
                  transition-all duration-200
                  hover:bg-primary/90 hover:-translate-y-[1px]
                  focus-visible:ring-2 focus-visible:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                `}
                disabled={!form.formState.isValid || updateWalletMutation.isPending}
              >
                {updateWalletMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Wallet Settings"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}