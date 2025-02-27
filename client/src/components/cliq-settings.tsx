import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { JORDANIAN_BANKS, type UpdateUserCliq } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const formSchema = z.object({
  bankName: z.enum(JORDANIAN_BANKS, {
    required_error: "Please select a bank",
  }),
  cliqType: z.enum(["alias", "number"], {
    required_error: "Please select how you want to receive payments",
  }),
  cliqAlias: z.string().nullable(),
  cliqNumber: z.string().nullable(),
  accountHolderName: z.string()
    .min(3, "Please enter your full name as it appears on your bank account")
    .max(50, "Name cannot exceed 50 characters"),
}).superRefine((data, ctx) => {
  if (data.cliqType === "alias" && (!data.cliqAlias || data.cliqAlias.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CliQ alias is required when using alias payment method",
      path: ["cliqAlias"],
    });
  }
  if (data.cliqType === "number" && (!data.cliqNumber || data.cliqNumber.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Phone number is required when using number payment method",
      path: ["cliqNumber"],
    });
  }
});

type FormData = z.infer<typeof formSchema>;

export default function CliqSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankName: user?.bankName || JORDANIAN_BANKS[0],
      cliqType: user?.cliqType || "alias",
      cliqAlias: user?.cliqAlias || null,
      cliqNumber: user?.cliqNumber || null,
      accountHolderName: user?.accountHolderName || user?.fullName || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const submitData: UpdateUserCliq = {
        bankName: formData.bankName,
        cliqType: formData.cliqType,
        accountHolderName: formData.accountHolderName,
        cliqAlias: formData.cliqType === "alias" ? formData.cliqAlias : null,
        cliqNumber: formData.cliqType === "number" ? formData.cliqNumber : null,
      };

      const res = await apiRequest("POST", "/api/user/settings/cliq", submitData);
      if (!res.ok) {
        throw new Error("Failed to save CliQ settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Settings Saved",
        description: "Your CliQ settings have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save CliQ settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Card className="border bg-card shadow-sm w-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-semibold tracking-tight">CliQ Account Settings</CardTitle>
        <CardDescription>
          Configure your CliQ payment details to receive JOD payments from USDT sales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormDescription>
                    Select your bank from the list of supported Jordanian banks
                  </FormDescription>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose your bank" />
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
              name="cliqType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CliQ Method</FormLabel>
                  <FormDescription>
                    Choose how you want to receive CliQ payments
                  </FormDescription>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="alias" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          CliQ Alias
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="number" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Phone Number
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("cliqType") === "alias" ? (
              <FormField
                control={form.control}
                name="cliqAlias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CliQ Alias</FormLabel>
                    <FormDescription>
                      Your unique CliQ alias for receiving payments (e.g., JOHN123)
                    </FormDescription>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Enter your CliQ alias (e.g., JOHN123)"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="cliqNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormDescription>
                      Your mobile number for receiving CliQ payments (e.g., 009627XXXXXXXX)
                    </FormDescription>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="009627XXXXXXXX"
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="accountHolderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder Name</FormLabel>
                  <FormDescription>
                    Enter your full name exactly as it appears on your bank account
                  </FormDescription>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter your full name as shown on bank account"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save CliQ Settings"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}