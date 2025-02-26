import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserWalletSchema, type UpdateUserWallet } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
      <CardHeader>
        <CardTitle>USDT Wallet Settings</CardTitle>
        <CardDescription>
          Set your USDT wallet address where you'll receive USDT from buy orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!user?.usdtAddress && (
          <Alert variant="warning" className="flex items-center gap-3 mb-4">
            <div className="shrink-0">
              <AlertCircle className="h-5 w-5 text-warning-foreground" aria-hidden="true" />
            </div>
            <AlertDescription className="text-sm">
              Please set your USDT wallet address to receive USDT from buy orders.
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => updateWalletMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="usdtNetwork"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>USDT Network</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="tron" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Tron (TRC20)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="bep20" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          BNB Smart Chain (BEP20)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="usdtAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>USDT Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your USDT wallet address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={updateWalletMutation.isPending}
            >
              {updateWalletMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}