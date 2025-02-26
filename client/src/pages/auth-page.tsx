import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { FeatureCard } from "@/components/ui/feature-card";
import { ThemeToggle } from "@/components/theme-toggle";

// Validation schema for login form
const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

export default function AuthPage() {
  const { loginMutation, registerMutation, user } = useAuth();
  const [, setLocation] = useLocation();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
    },
  });

  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex flex-col justify-center px-4 sm:px-6 py-8 sm:py-12">
      {/* Theme Toggle - Adjusted positioning */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mt-8 lg:mt-0">
        {/* Auth Form Section */}
        <Card className="w-full max-w-md mx-auto lg:order-2 border-0 shadow-xl bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30 transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="space-y-6 items-center text-center pb-8">
            <div className="lg:hidden">
              <BrandLogo size="md" className="transform-gpu transition-transform hover:scale-105 duration-300" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Welcome to ExchangePro
              </CardTitle>
              <p className="text-sm sm:text-base text-muted-foreground">
                Your trusted USDT exchange platform
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="text-sm sm:text-base py-3 font-medium">Login</TabsTrigger>
                <TabsTrigger value="register" className="text-sm sm:text-base py-3 font-medium">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-6">
                <LoginForm form={loginForm} mutation={loginMutation} />
              </TabsContent>

              <TabsContent value="register" className="space-y-6">
                <RegisterForm form={registerForm} mutation={registerMutation} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Hero Section - Hidden on mobile */}
        <div className="hidden lg:block lg:order-1 space-y-8">
          <BrandLogo size="lg" withText={false} />
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              USDT Exchange Platform
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Exchange USDT for Jordanian Dinars securely and efficiently. Experience competitive rates and fast transactions.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            <FeatureCard
              title="Secure Trading"
              description="Advanced security measures protect your transactions and personal information"
            />
            <FeatureCard
              title="Fast Processing"
              description="Quick verification and speedy transaction processing"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ form, mutation }) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-6"
      >
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
                  className="h-11 sm:h-12 px-4 bg-white dark:bg-white/5 text-foreground border-border/50 focus-visible:ring-primary transition-colors"
                />
              </FormControl>
              <FormMessage className="text-sm" />
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
                  autoComplete="current-password"
                  aria-required="true"
                  className="h-11 sm:h-12 px-4 bg-white dark:bg-white/5 text-foreground border-border/50 focus-visible:ring-primary transition-colors"
                />
              </FormControl>
              <FormMessage className="text-sm" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium transition-all hover:bg-primary/90 active:scale-[0.98]"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm({ form, mutation }) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-6"
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
                  className="h-11 sm:h-12 px-4 bg-white dark:bg-white/5 text-foreground border-border/50 focus-visible:ring-primary transition-colors"
                />
              </FormControl>
              <FormMessage className="text-sm" />
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
                  className="h-11 sm:h-12 px-4 bg-white dark:bg-white/5 text-foreground border-border/50 focus-visible:ring-primary transition-colors"
                />
              </FormControl>
              <FormMessage className="text-sm" />
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
                  className="h-11 sm:h-12 px-4 bg-white dark:bg-white/5 text-foreground border-border/50 focus-visible:ring-primary transition-colors"
                />
              </FormControl>
              <FormMessage className="text-sm" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium transition-all hover:bg-primary/90 active:scale-[0.98]"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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