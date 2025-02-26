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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex flex-col justify-center px-4 sm:px-6 py-8 sm:py-12 overflow-hidden">
      {/* Theme Toggle - Fixed position with responsive spacing */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mt-4 sm:mt-8 lg:mt-0">
        {/* Auth Form Section - Glassmorphic card with responsive padding */}
        <Card className="w-full max-w-md mx-auto lg:order-2 border-0 shadow-xl bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
          <CardHeader className="space-y-4 sm:space-y-6 items-center text-center pb-6 sm:pb-8">
            {/* Show logo only on mobile/tablet */}
            <div className="lg:hidden">
              <BrandLogo size="md" className="transform-gpu transition-transform hover:scale-105 duration-300" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Welcome to ExchangePro
              </CardTitle>
              <p className="text-sm sm:text-base text-muted-foreground">
                Your trusted USDT exchange platform
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {/* Auth Forms with Tab Navigation */}
            <Tabs defaultValue="login" className="space-y-6 sm:space-y-8" role="tablist" aria-label="Authentication forms">
              {/* Tab Headers */}
              <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/30 backdrop-blur supports-[backdrop-filter]:bg-muted/20 rounded-lg">
                <TabsTrigger 
                  value="login" 
                  className="text-sm sm:text-base py-3 sm:py-3.5 px-2 font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-colors duration-200 hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" 
                  role="tab" 
                  aria-controls="login-tab" 
                  aria-selected="true"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="text-sm sm:text-base py-3 sm:py-3.5 px-2 font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-colors duration-200 hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" 
                  role="tab" 
                  aria-controls="register-tab" 
                  aria-selected="false"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Tab Content Container - Fixed height to prevent layout shifts */}
              <div className="min-h-[320px] relative">
                <TabsContent 
                  value="login" 
                  id="login-tab" 
                  role="tabpanel" 
                  tabIndex={0} 
                  className="space-y-6 outline-none"
                >
                  <LoginForm form={loginForm} mutation={loginMutation} />
                </TabsContent>

                <TabsContent 
                  value="register" 
                  id="register-tab" 
                  role="tabpanel" 
                  tabIndex={0} 
                  className="space-y-6 outline-none"
                >
                  <RegisterForm form={registerForm} mutation={registerMutation} />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Hero Section - Only visible on desktop */}
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
            <FeatureCard title="Secure Trading" description="Advanced security measures protect your transactions and personal information" />
            <FeatureCard title="Fast Processing" description="Quick verification and speedy transaction processing" />
          </div>
        </div>
      </div>
    </div>
  );
}