import { AuthProvider } from "./hooks/use-auth";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import AdminPage from "@/pages/admin-page";
import SettingsPage from "@/pages/settings-page";
import { ProtectedRoute } from "./lib/protected-route";
import NavBar from "./components/nav-bar";
import { ThemeProvider } from "./components/theme-provider";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      </Route>
      <Route path="/auth" component={AuthPage} />
      <Route path="/admin">
        <ProtectedRoute adminOnly>
          <AdminPage />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <div className="min-h-screen bg-background">
          <AuthProvider>
            <NavBar />
            <Router />
          </AuthProvider>
          <Toaster />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;