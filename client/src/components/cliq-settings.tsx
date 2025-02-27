import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { JORDANIAN_BANKS, type UpdateUserCliq } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";

// Form validation schema
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
    .optional(),
  cliqNumber: z.string()
    .regex(/^009627\d{8}$/, "Please enter a valid Jordanian phone number starting with 009627")
    .optional(),
  accountHolderName: z.string()
    .min(3, "Please enter your full name as it appears on your bank account")
    .max(50, "Name cannot exceed 50 characters"),
}).refine(
  (data) => {
    if (data.cliqType === "alias" && !data.cliqAlias) {
      return false;
    }
    if (data.cliqType === "number" && !data.cliqNumber) {
      return false;
    }
    return true;
  },
  {
    message: "Please provide either a CliQ alias or phone number based on your selection",
    path: ["cliqType"],
  }
);

type FormData = z.infer<typeof formSchema>;

export default function CliqSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankName: user?.bankName as (typeof JORDANIAN_BANKS)[number] || JORDANIAN_BANKS[0],
      cliqType: user?.cliqType as "alias" | "number" || "alias",
      cliqAlias: user?.cliqAlias || "",
      cliqNumber: user?.cliqNumber || "",
      accountHolderName: user?.accountHolderName || user?.fullName || "",
    },
    mode: "onChange"
  });

  const mutation = useMutation({
    mutationFn: async (data: UpdateUserCliq) => {
      const res = await apiRequest("POST", "/api/settings/cliq", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save CliQ settings");
      }
      return await res.json();
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

  const onSubmit = (data: FormData) => {
    const submitData: UpdateUserCliq = {
      ...data,
      cliqAlias: data.cliqType === "alias" ? data.cliqAlias : undefined,
      cliqNumber: data.cliqType === "number" ? data.cliqNumber : undefined,
    };

    mutation.mutate(submitData);
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
            {/* Bank Name Field */}
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
                      <SelectTrigger
                        className={`
                          h-11 text-base 
                          transition-all duration-200
                          hover:border-input focus-visible:ring-2 focus-visible:ring-offset-2
                          hover:-translate-y-[1px]
                          ${form.formState.errors.bankName ? "border-destructive" : ""}
                        `}
                      >
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
                  <FormMessage className="flex items-center gap-2 text-sm font-medium text-destructive animate-in fade-in-50">
                    {form.formState.errors.bankName?.message && (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {form.formState.errors.bankName?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            {/* CliQ Type Field */}
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
                          <RadioGroupItem
                            value="alias"
                            className="h-5 w-5 border-2 transition-all duration-200 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-offset-2"
                          />
                        </FormControl>
                        <FormLabel className="text-base font-medium leading-none cursor-pointer select-none">
                          CliQ Alias
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="number"
                            className="h-5 w-5 border-2 transition-all duration-200 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-offset-2"
                          />
                        </FormControl>
                        <FormLabel className="text-base font-medium leading-none cursor-pointer select-none">
                          Phone Number
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="flex items-center gap-2 text-sm font-medium text-destructive animate-in fade-in-50">
                    {form.formState.errors.cliqType?.message && (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {form.formState.errors.cliqType?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            {/* Conditional Fields based on CliQ Type */}
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
                        placeholder="Enter your CliQ alias (e.g., JOHN123)"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className={`
                          h-11 text-base 
                          transition-all duration-200
                          hover:border-input focus-visible:ring-2 focus-visible:ring-offset-2
                          ${form.formState.errors.cliqAlias ? "border-destructive" : ""}
                          transform-gpu hover:-translate-y-[1px]
                        `}
                      />
                    </FormControl>
                    <FormMessage className="flex items-center gap-2 text-sm font-medium text-destructive animate-in fade-in-50">
                      {form.formState.errors.cliqAlias?.message && (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {form.formState.errors.cliqAlias?.message}
                    </FormMessage>
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
                        placeholder="009627XXXXXXXX"
                        className={`
                          h-11 text-base font-mono
                          transition-all duration-200
                          hover:border-input focus-visible:ring-2 focus-visible:ring-offset-2
                          ${form.formState.errors.cliqNumber ? "border-destructive" : ""}
                          transform-gpu hover:-translate-y-[1px]
                        `}
                      />
                    </FormControl>
                    <FormMessage className="flex items-center gap-2 text-sm font-medium text-destructive animate-in fade-in-50">
                      {form.formState.errors.cliqNumber?.message && (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {form.formState.errors.cliqNumber?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />
            )}

            {/* Account Holder Name Field */}
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
                      className={`
                        h-11 text-base 
                        transition-all duration-200
                        hover:border-input focus-visible:ring-2 focus-visible:ring-offset-2
                        ${form.formState.errors.accountHolderName ? "border-destructive" : ""}
                        transform-gpu hover:-translate-y-[1px]
                      `}
                    />
                  </FormControl>
                  <FormMessage className="flex items-center gap-2 text-sm font-medium text-destructive animate-in fade-in-50">
                    {form.formState.errors.accountHolderName?.message && (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {form.formState.errors.accountHolderName?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            {/* Submit Button */}
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
                disabled={!form.formState.isValid || mutation.isPending}
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