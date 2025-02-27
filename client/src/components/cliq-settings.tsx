import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserCliqSchema, JORDANIAN_BANKS } from "@shared/schema";
import type { UpdateUserCliq } from "@shared/schema";
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

export default function CliqSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdateUserCliq>({
    resolver: zodResolver(updateUserCliqSchema.extend({
      cliqAlias: updateUserCliqSchema.shape.cliqAlias
        .regex(/^[A-Z0-9]*[A-Z]+[A-Z0-9]*$/, "Alias must contain at least one letter and be uppercase")
        .min(3, "Alias must be at least 3 characters")
        .max(10, "Alias cannot exceed 10 characters"),
      cliqNumber: updateUserCliqSchema.shape.cliqNumber
        .regex(/^009627\d{8}$/, "Number must start with 009627 followed by 8 digits"),
      accountHolderName: updateUserCliqSchema.shape.accountHolderName
        .min(3, "Name must be at least 3 characters")
        .max(50, "Name cannot exceed 50 characters")
    })),
    defaultValues: {
      bankName: user?.bankName || JORDANIAN_BANKS[0],
      cliqType: user?.cliqType || "alias",
      cliqAlias: user?.cliqAlias || "",
      cliqNumber: user?.cliqNumber || "",
      accountHolderName: user?.accountHolderName || user?.fullName || "",
    },
    mode: "onChange" // Enable real-time validation
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
        title: "Success",
        description: "Your CliQ settings have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateUserCliq) => {
    if (data.cliqType === "alias") {
      data.cliqNumber = "";
    } else {
      data.cliqAlias = "";
    }

    if (!data.cliqAlias && !data.cliqNumber) {
      toast({
        title: "Error",
        description: "Please provide either a CliQ alias or number",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(data);
  };

  return (
    <Card className="border bg-card shadow-sm">
      <CardHeader className="space-y-2 border-b bg-muted/50 px-6 py-4">
        <CardTitle className="text-2xl font-semibold tracking-tight">CliQ Account Settings</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Configure your CliQ payment details to receive JOD payments from USDT sales. Enter your bank information and preferred CliQ identification method below.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                      <SelectTrigger className={`h-11 text-base transition-colors hover:border-input focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        form.formState.errors.bankName ? "border-destructive" : ""
                      }`}>
                        <SelectValue placeholder="Select your bank" />
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

            <FormField
              control={form.control}
              name="cliqType"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-semibold">CliQ Account Type</FormLabel>
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
                      <RadioGroupItem value="alias" className="h-5 w-5 border-2 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-offset-2">
                        <FormLabel className="text-base font-medium leading-none cursor-pointer select-none">
                          CliQ Alias
                        </FormLabel>
                      </RadioGroupItem>
                      <RadioGroupItem value="number" className="h-5 w-5 border-2 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-offset-2">
                        <FormLabel className="text-base font-medium leading-none cursor-pointer select-none">
                          CliQ Number
                        </FormLabel>
                      </RadioGroupItem>
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

            {form.watch("cliqType") === "alias" ? (
              <FormField
                control={form.control}
                name="cliqAlias"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-semibold">CliQ Alias/Username</FormLabel>
                      <FormDescription className="text-sm text-muted-foreground">
                        Your unique CliQ alias for receiving payments. Must contain at least one letter and can include numbers.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your CliQ alias (e.g., JOHN123)"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className={`h-11 text-base transition-colors hover:border-input focus-visible:ring-2 focus-visible:ring-offset-2 ${
                          form.formState.errors.cliqAlias ? "border-destructive" : ""
                        }`}
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
                      <FormLabel className="text-sm font-semibold">CliQ Number</FormLabel>
                      <FormDescription className="text-sm text-muted-foreground">
                        Your phone number for receiving CliQ payments. Must start with 009627 followed by 8 digits.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="009627xxxxxxxx" 
                        className={`h-11 text-base transition-colors hover:border-input focus-visible:ring-2 focus-visible:ring-offset-2 font-mono ${
                          form.formState.errors.cliqNumber ? "border-destructive" : ""
                        }`}
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

            <FormField
              control={form.control}
              name="accountHolderName"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-semibold">Account Holder Name</FormLabel>
                    <FormDescription className="text-sm text-muted-foreground">
                      The name associated with your bank account for verification purposes
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter the full name on your bank account"
                      className={`h-11 text-base transition-colors hover:border-input focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        form.formState.errors.accountHolderName ? "border-destructive" : ""
                      }`}
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

            <div className="pt-4 border-t">
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-offset-2"
                disabled={!form.formState.isValid || mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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