import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const MOCK_RATE = 0.71; // 1 USDT = 0.71 JOD

export default function TradeForm() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  const form = useForm({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "buy",
      amount: "",
      rate: MOCK_RATE,
    },
  });

  const tradeMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/trade", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      form.reset();
      setFile(null);
      toast({
        title: "Trade submitted",
        description: "Your trade request has been submitted for approval",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Trade failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: any) => {
    if (!file) {
      toast({
        title: "Missing proof of payment",
        description: "Please upload your payment proof",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    formData.append("proofOfPayment", file);
    
    tradeMutation.mutate(formData);
  };

  return (
    <Tabs defaultValue="buy" onValueChange={(value) => form.setValue("type", value)}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="buy">Buy USDT</TabsTrigger>
        <TabsTrigger value="sell">Sell USDT</TabsTrigger>
      </TabsList>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ({form.watch("type") === "buy" ? "JOD" : "USDT"})</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between mb-2">
              <span>Rate</span>
              <span>1 USDT = {MOCK_RATE} JOD</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>You will {form.watch("type") === "buy" ? "receive" : "pay"}</span>
              <span>
                {Number(form.watch("amount") || 0) * (form.watch("type") === "buy" ? (1/MOCK_RATE) : MOCK_RATE)} {form.watch("type") === "buy" ? "USDT" : "JOD"}
              </span>
            </div>
          </div>

          <div>
            <FormLabel>Payment Proof</FormLabel>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept="image/*"
              className="mt-2"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={tradeMutation.isPending}
          >
            {tradeMutation.isPending ? "Processing..." : "Submit Trade"}
          </Button>
        </form>
      </Form>
    </Tabs>
  );
}
