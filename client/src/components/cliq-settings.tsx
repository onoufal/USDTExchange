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
import { Loader2 } from "lucide-react";

export default function CliqSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdateUserCliq>({
    resolver: zodResolver(updateUserCliqSchema),
    defaultValues: {
      bankName: user?.bankName || JORDANIAN_BANKS[0],
      cliqType: user?.cliqType || "alias",
      cliqAlias: user?.cliqAlias || "",
      cliqNumber: user?.cliqNumber || "",
      accountHolderName: user?.accountHolderName || user?.fullName || "",
    },
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
    // Clear the field that's not being used based on cliqType
    if (data.cliqType === "alias") {
      data.cliqNumber = ""; // Clear number when using alias
    } else {
      data.cliqAlias = ""; // Clear alias when using number
    }

    // Validate that at least one of alias or number is set
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
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-2xl font-semibold tracking-tight">CliQ Account Settings</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Configure your CliQ payment details for receiving JOD from USDT sales
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium">Bank Name</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your bank" />
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
                  <FormMessage className="text-sm font-medium text-destructive animate-in fade-in-50" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cliqType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium">CliQ Account Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-3"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="alias" />
                        </FormControl>
                        <FormLabel className="text-sm font-medium">
                          CliQ Alias
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="number" />
                        </FormControl>
                        <FormLabel className="text-sm font-medium">
                          CliQ Number
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-sm font-medium text-destructive animate-in fade-in-50" />
                </FormItem>
              )}
            />

            {form.watch("cliqType") === "alias" ? (
              <FormField
                control={form.control}
                name="cliqAlias"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-medium">CliQ Alias/Username</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your CliQ alias"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
                      Must contain at least one letter, can include numbers, and not exceed 10 characters
                    </FormDescription>
                    <FormMessage className="text-sm font-medium text-destructive animate-in fade-in-50" />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="cliqNumber"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-medium">CliQ Number</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="009627xxxxxxxx" 
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
                      Format: 009627 followed by 8 digits
                    </FormDescription>
                    <FormMessage className="text-sm font-medium text-destructive animate-in fade-in-50" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="accountHolderName"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium">Account Holder Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-10" />
                  </FormControl>
                  <FormMessage className="text-sm font-medium text-destructive animate-in fade-in-50" />
                </FormItem>
              )}
            />

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-10 font-medium transition-colors"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
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