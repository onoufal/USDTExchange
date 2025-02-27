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
import { Loader2 } from "lucide-react";

export default function WalletSettings() {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<UpdateUserWallet>({
    resolver: zodResolver(updateUserWalletSchema),
    defaultValues: {
      usdtAddress: user?.usdtAddress || "",
      usdtNetwork: user?.usdtNetwork as "tron" | "bep20" || "tron"
    }
  });

  const updateWalletMutation = useMutation({
    mutationFn: async (data: UpdateUserWallet) => {
      const res = await apiRequest("POST", "/api/settings/wallet", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update wallet settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Wallet settings updated",
        description: "Your USDT wallet settings have been saved"
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
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-2xl font-semibold tracking-tight">USDT Wallet Settings</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Set your USDT wallet address where you'll receive USDT from buy orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => updateWalletMutation.mutate(data))} className="space-y-6">
            <FormField
              control={form.control}
              name="usdtNetwork"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium">USDT Network</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid gap-3"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="tron" />
                        </FormControl>
                        <FormLabel className="text-sm font-medium">
                          Tron (TRC20)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="bep20" />
                        </FormControl>
                        <FormLabel className="text-sm font-medium">
                          BNB Smart Chain (BEP20)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription className="text-sm text-muted-foreground">
                    Select the blockchain network for your USDT transactions
                  </FormDescription>
                  <FormMessage className="text-sm font-medium text-destructive animate-in fade-in-50" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="usdtAddress"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium">USDT Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your USDT wallet address" 
                      {...field}
                      className="h-10"
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-muted-foreground">
                    This address will be used to receive USDT from buy orders
                  </FormDescription>
                  <FormMessage className="text-sm font-medium text-destructive animate-in fade-in-50" />
                </FormItem>
              )}
            />

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-10 font-medium transition-colors"
                disabled={updateWalletMutation.isPending}
              >
                {updateWalletMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
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