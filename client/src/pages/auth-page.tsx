import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { BrandLogo } from "@/components/ui/brand-logo";
import { FeatureCard } from "@/components/ui/feature-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/components/login-form";
import { RegisterForm } from "@/components/register-form";

// Validation schema for login form - only username and password required
const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

export default function AuthPage() {
  const { loginMutation, registerMutation, user } = useAuth();
  const [, setLocation] = useLocation();

  // Initialize login form with validation schema
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Initialize registration form with full user schema
  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
    },
  });

  // Redirect to home if user is already authenticated
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex flex-col justify-center px-4 sm:px-6 py-8 sm:py-12 overflow-hidden relative">
      {/* Theme Toggle - Fixed position with responsive spacing */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[size:75px_75px] dark:bg-grid-slate-400/[0.05] -z-10" />
      <div className="absolute inset-0 flex items-center justify-center -z-10">
        <div className="w-full h-full max-w-7xl mx-auto">
          <div className="absolute right-0 top-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute left-0 bottom-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mt-4 sm:mt-8 lg:mt-0">
        {/* Auth Form Section - Glassmorphic card with responsive padding */}
        <Card className="w-full max-w-md mx-auto lg:order-2 border-0 shadow-xl bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Card Header with improved contrast and consistent spacing */}
          <CardHeader className="space-y-6 sm:space-y-8 items-center text-center pb-8 sm:pb-10">
            {/* Show logo only on mobile/tablet */}
            <div className="lg:hidden">
              <BrandLogo size="md" className="transform-gpu transition-transform hover:scale-105 duration-300" />
            </div>
            <div className="space-y-3">
              <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Welcome to ExchangePro
              </CardTitle>
              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed max-w-sm mx-auto">
                Your trusted USDT exchange platform
              </p>
            </div>
          </CardHeader>

          {/* Card content with improved spacing */}
          <CardContent className="pb-8 sm:pb-10">
            {/* Auth Forms with Tab Navigation */}
            <Tabs defaultValue="login" className="space-y-8" role="tablist" aria-label="Authentication forms">
              {/* Tab Headers with increased spacing */}
              <TabsList
                className="h-[52px] grid w-full grid-cols-2 rounded-lg bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/40 mt-1 p-0.5"
                role="tablist"
              >
                <TabsTrigger
                  value="login"
                  className="h-[50px] min-text-[14px] text-sm sm:text-base font-semibold flex items-center justify-center data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-colors duration-200 hover:text-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  role="tab"
                  aria-controls="login-tab"
                  aria-selected="true"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="h-[50px] min-text-[14px] text-sm sm:text-base font-semibold flex items-center justify-center data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-colors duration-200 hover:text-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  role="tab"
                  aria-controls="register-tab"
                  aria-selected="false"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Tab Content Container with consistent spacing */}
              <div className="min-h-[320px] relative mt-6">
                <TabsContent
                  value="login"
                  id="login-tab"
                  role="tabpanel"
                  tabIndex={0}
                  className="space-y-6 outline-none px-1"
                >
                  <LoginForm form={loginForm} mutation={loginMutation} />
                </TabsContent>

                <TabsContent
                  value="register"
                  id="register-tab"
                  role="tabpanel"
                  tabIndex={0}
                  className="space-y-6 outline-none px-1"
                >
                  <RegisterForm form={registerForm} mutation={registerMutation} />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Hero Section - Only visible on desktop */}
        <div className="hidden lg:block lg:order-1 space-y-8">
          <BrandLogo size="lg" withText={false} className="animate-in fade-in duration-700" />
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent relative drop-shadow-sm animate-in fade-in slide-in-from-left-4 duration-1000 delay-300">
              USDT Exchange Platform
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
              <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-foreground/80 leading-relaxed max-w-2xl relative z-10 animate-in fade-in slide-in-from-left-4 duration-1000 delay-500">
              Exchange USDT for Jordanian Dinars securely and efficiently. Experience competitive rates and fast transactions.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl relative pt-4 animate-in fade-in slide-in-from-left-4 duration-1000 delay-700">
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