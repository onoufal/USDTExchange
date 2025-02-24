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
      return await res.json();
    },
    onSuccess: () => {
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
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="bankName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Name</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cliqType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>CliQ Account Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="alias" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      CliQ Alias
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="number" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      CliQ Number
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
                <FormLabel>CliQ Alias/Username</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="Enter your CliQ alias"
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormDescription>
                  Must contain at least one letter, can include numbers, and not exceed 10 characters
                </FormDescription>
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
                <FormLabel>CliQ Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="009627xxxxxxxx" />
                </FormControl>
                <FormDescription>
                  Format: 009627 followed by 8 digits
                </FormDescription>
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
              <FormControl>
                <Input {...field} />
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
          {mutation.isPending ? "Saving..." : "Save CliQ Settings"}
        </Button>
      </form>
    </Form>
  );
}