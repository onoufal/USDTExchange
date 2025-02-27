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
  cliqAlias: z.string()
    .regex(/^[A-Z0-9]*[A-Z]+[A-Z0-9]*$/, "Please use uppercase letters and numbers only")
    .min(3, "Your alias should be at least 3 characters long")
    .max(10, "Your alias cannot be longer than 10 characters")
    .nullable(),
  cliqNumber: z.string()
    .regex(/^009627\d{8}$/, "Please enter a valid Jordanian phone number starting with 009627")
    .nullable(),
  accountHolderName: z.string()
    .min(3, "Please enter your full name as it appears on your bank account")
    .max(50, "Name cannot exceed 50 characters"),
}).superRefine((data, ctx) => {
  if (data.cliqType === "alias" && !data.cliqAlias) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CliQ alias is required when using alias payment method",
      path: ["cliqAlias"],
    });
  }
  if (data.cliqType === "number" && !data.cliqNumber) {
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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure smooth animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankName: (user?.bankName as (typeof JORDANIAN_BANKS)[number]) || JORDANIAN_BANKS[0],
      cliqType: (user?.cliqType as "alias" | "number") || "alias",
      cliqAlias: user?.cliqAlias || null,
      cliqNumber: user?.cliqNumber || null,
      accountHolderName: user?.accountHolderName || user?.fullName || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UpdateUserCliq) => {
      try {
        const res = await apiRequest("POST", "/api/user/settings/cliq", data);
        if (!res.ok) {
          const error = await res.json().catch(() => ({ message: "Failed to save CliQ settings" }));
          throw new Error(error.message || "Failed to save CliQ settings");
        }
        return await res.json();
      } catch (error) {
        console.error("CliQ settings mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Settings Saved Successfully",
        description: "Your CliQ payment details have been updated and are ready to use.",
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

  const onSubmit = async (data: FormData) => {
    const submitData: UpdateUserCliq = {
      bankName: data.bankName,
      cliqType: data.cliqType,
      accountHolderName: data.accountHolderName,
      cliqAlias: data.cliqType === "alias" ? data.cliqAlias : null,
      cliqNumber: data.cliqType === "number" ? data.cliqNumber : null,
    };

    try {
      await mutation.mutateAsync(submitData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Card
      className={`
        border bg-card shadow-sm w-full 
        transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
    >
      <CardHeader className="space-y-2 border-b bg-muted/50 px-4 sm:px-6 py-4">
        <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">CliQ Account Settings</CardTitle>
        <CardDescription className="text-sm sm:text-base text-muted-foreground">
          Configure your CliQ payment details to receive JOD payments from USDT sales
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-semibold">Bank Name</FormLabel>
                    <FormDescription className="text-sm text-muted-foreground">
                      Select your bank from the list of supported Jordanian banks
                    </FormDescription>
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Choose your bank" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {JORDANIAN_BANKS.map((bank) => (
                        <SelectItem key={bank} value={bank} className="text-base">
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
                <FormItem className="space-y-4">
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-semibold">CliQ Method</FormLabel>
                    <FormDescription className="text-sm text-muted-foreground">
                      Choose how you want to receive CliQ payments
                    </FormDescription>
                  </div>
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
                        <FormLabel className="text-base font-medium leading-none cursor-pointer">
                          CliQ Alias
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="number" />
                        </FormControl>
                        <FormLabel className="text-base font-medium leading-none cursor-pointer">
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
                  <FormItem className="space-y-4">
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-semibold">CliQ Alias</FormLabel>
                      <FormDescription className="text-sm text-muted-foreground">
                        Your unique CliQ alias for receiving payments (e.g., JOHN123)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Enter your CliQ alias (e.g., JOHN123)"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="h-11 text-base"
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
                  <FormItem className="space-y-4">
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-semibold">Phone Number</FormLabel>
                      <FormDescription className="text-sm text-muted-foreground">
                        Your mobile number for receiving CliQ payments (e.g., 009627XXXXXXXX)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="009627XXXXXXXX"
                        className="h-11 text-base font-mono"
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
                <FormItem className="space-y-4">
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-semibold">Account Holder Name</FormLabel>
                    <FormDescription className="text-sm text-muted-foreground">
                      Enter your full name exactly as it appears on your bank account
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter your full name as shown on bank account"
                      className="h-11 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t">
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
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
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}