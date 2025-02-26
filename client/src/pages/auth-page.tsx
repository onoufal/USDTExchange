import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { FeatureCard } from "@/components/ui/feature-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useTranslation } from "react-i18next";

// Validation schema for login form
const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

export default function AuthPage() {
  const { loginMutation, registerMutation, user } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4 sm:p-8">
      {/* Theme and Language Toggles */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        {/* Auth Form Section */}
        <Card className="w-full max-w-md mx-auto lg:order-2 border-0 shadow-xl bg-card/50 backdrop-blur transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="space-y-4 items-center text-center">
            <BrandLogo size="md" />
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-in fade-in zoom-in-95 duration-300">
              {t('common.welcome')}
            </CardTitle>
            <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="italic">[Your Brand]</span> - {t('common.brandDescription')}
            </p>
          </CardHeader>
          <CardContent>
            <AuthTabs 
              loginForm={loginForm}
              registerForm={registerForm}
              loginMutation={loginMutation}
              registerMutation={registerMutation}
            />
          </CardContent>
        </Card>

        {/* Hero Section */}
        <div className="text-center lg:text-left lg:order-1 space-y-6 animate-in slide-in-from-left-8 duration-700">
          <BrandLogo size="lg" withText={false} />

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-left duration-500">
            <span className="italic">[Your Brand]</span><br />
            {t('common.platform')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-left-4 duration-700">
            {t('common.description')}
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto lg:mx-0">
            <FeatureCard
              title={t('common.secure')}
              description={t('common.secureDescription')}
            />
            <FeatureCard
              title={t('common.fast')}
              description={t('common.fastDescription')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthTabs({ loginForm, registerForm, loginMutation, registerMutation }) {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="login" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 transition-colors">
        <TabsTrigger value="login" className="data-[state=active]:animate-in data-[state=active]:fade-in">
          {t('common.login')}
        </TabsTrigger>
        <TabsTrigger value="register" className="data-[state=active]:animate-in data-[state=active]:fade-in">
          {t('common.register')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="space-y-4 animate-in fade-in-50 duration-300">
        <LoginForm form={loginForm} mutation={loginMutation} />
      </TabsContent>

      <TabsContent value="register" className="space-y-4 animate-in fade-in-50 duration-300">
        <RegisterForm form={registerForm} mutation={registerMutation} />
      </TabsContent>
    </Tabs>
  );
}

function LoginForm({ form, mutation }) {
  const { t } = useTranslation();

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))} 
        className="space-y-4"
        aria-label="Login form"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.username')}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  autoComplete="username" 
                  aria-required="true"
                  className="bg-white text-black border-gray-200 focus:border-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.password')}</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  {...field} 
                  autoComplete="current-password" 
                  aria-required="true"
                  className="bg-white text-black border-gray-200 focus:border-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          className="w-full transition-all hover:bg-blue-700 hover:scale-105 duration-200"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>{t('common.signingIn')}</span>
            </>
          ) : (
            t('common.signIn')
          )}
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm({ form, mutation }) {
  const { t } = useTranslation();

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))} 
        className="space-y-4"
        aria-label="Registration form"
      >
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.fullName')}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  autoComplete="name" 
                  aria-required="true"
                  className="bg-white text-black border-gray-200 focus:border-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.username')}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  autoComplete="username" 
                  aria-required="true"
                  className="bg-white text-black border-gray-200 focus:border-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.password')}</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  {...field} 
                  autoComplete="new-password" 
                  aria-required="true"
                  className="bg-white text-black border-gray-200 focus:border-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          className="w-full transition-all hover:bg-blue-700 hover:scale-105 duration-200"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>{t('common.creatingAccount')}</span>
            </>
          ) : (
            t('common.createAccount')
          )}
        </Button>
      </form>
    </Form>
  );
}