import { useForm, UseFormReturn } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { InsertUser } from "@shared/types";
import { useCallback } from "react";

interface RegisterFormProps {
  form: UseFormReturn<InsertUser>;
  mutation: UseMutationResult<any, Error, InsertUser>;
}

export function RegisterForm({ form, mutation }: RegisterFormProps) {
  const onSubmit = useCallback((data: InsertUser) => {
    mutation.mutate(data);
  }, [mutation]);

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-6"
        aria-label="Registration form"
      >
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem className="space-y-2.5">
              <FormLabel className="text-sm sm:text-base font-medium">Full Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={!!form.formState.errors.fullName}
                  aria-describedby={form.formState.errors.fullName ? "fullName-error" : undefined}
                  className="h-11 sm:h-12 px-4 bg-white dark:bg-white/5 text-foreground border-border/50 focus-visible:ring-primary transition-colors"
                />
              </FormControl>
              <FormMessage className="text-sm" id="fullName-error" role="alert" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="space-y-2.5">
              <FormLabel className="text-sm sm:text-base font-medium">Username</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="username"
                  aria-required="true"
                  aria-invalid={!!form.formState.errors.username}
                  aria-describedby={form.formState.errors.username ? "username-error" : undefined}
                  className="h-11 sm:h-12 px-4 bg-white dark:bg-white/5 text-foreground border-border/50 focus-visible:ring-primary transition-colors"
                />
              </FormControl>
              <FormMessage className="text-sm" id="username-error" role="alert" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2.5">
              <FormLabel className="text-sm sm:text-base font-medium">Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  {...field}
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={form.formState.errors.password ? "password-error" : undefined}
                  className="h-11 sm:h-12 px-4 bg-white dark:bg-white/5 text-foreground border-border/50 focus-visible:ring-primary transition-colors"
                />
              </FormControl>
              <FormMessage className="text-sm" id="password-error" role="alert" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium transition-all hover:bg-primary/90 active:scale-[0.98]"
          disabled={mutation.isPending}
          aria-live="polite"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Creating Account...</span>
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </Form>
  );
}