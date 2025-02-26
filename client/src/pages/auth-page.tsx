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
import { Loader2, CreditCard } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        {/* Auth Form Section */}
        <Card className="w-full max-w-md mx-auto lg:order-2 border-0 shadow-xl bg-card/50 backdrop-blur transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="space-y-4 items-center text-center">
            {/* Logo Placeholder */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 transition-transform hover:scale-105 duration-300">
              <CreditCard className="w-6 h-6 text-primary" />
              <span className="sr-only">Your Logo Here</span>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-in fade-in zoom-in-95 duration-300">
              Welcome to ExchangePro
            </CardTitle>
            <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Brand Name Placeholder */}
              <span className="italic">[Your Brand Name]</span> - Your trusted USDT exchange platform
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 transition-colors">
                <TabsTrigger value="login" className="data-[state=active]:animate-in data-[state=active]:fade-in">Login</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:animate-in data-[state=active]:fade-in">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 animate-in fade-in-50 duration-300">
                <Form {...loginForm}>
                  <form 
                    onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} 
                    className="space-y-4"
                    aria-label="Login form"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} autoComplete="username" aria-required="true" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              autoComplete="current-password" 
                              aria-required="true"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full transition-all hover:bg-blue-700 hover:scale-105 duration-200"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
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
              </TabsContent>

              <TabsContent value="register" className="space-y-4 animate-in fade-in-50 duration-300">
                <Form {...registerForm}>
                  <form 
                    onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} 
                    className="space-y-4"
                    aria-label="Registration form"
                  >
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} autoComplete="name" aria-required="true" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} autoComplete="username" aria-required="true" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              autoComplete="new-password" 
                              aria-required="true"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full transition-all hover:bg-blue-700 hover:scale-105 duration-200"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Hero Section */}
        <div className="text-center lg:text-left lg:order-1 space-y-6 animate-in slide-in-from-left-8 duration-700">
          {/* Brand Image Placeholder */}
          <div className="w-24 h-24 mx-auto lg:mx-0 mb-6 rounded-xl bg-primary/10 flex items-center justify-center transition-transform hover:scale-105 duration-300">
            <span className="text-xs text-center text-muted-foreground p-2">
              [Your Brand Logo]
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-left duration-500">
            {/* Brand Name Placeholder */}
            <span className="italic">[Your Brand]</span><br />
            USDT Exchange Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-left-4 duration-700">
            Exchange USDT for Jordanian Dinars securely and efficiently. Experience competitive rates and fast transactions.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto lg:mx-0">
            <div className="p-4 rounded-lg bg-card/50 backdrop-blur border border-border/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <h3 className="font-semibold text-lg mb-2">Secure Trading</h3>
              <p className="text-muted-foreground">
                Advanced security measures protect your transactions and personal information
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card/50 backdrop-blur border border-border/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <h3 className="font-semibold text-lg mb-2">Fast Processing</h3>
              <p className="text-muted-foreground">
                Quick verification and speedy transaction processing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}