import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  adminOnly = false,
}: {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user || (adminOnly && user.role !== "admin")) {
    return <Route path={path}>
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold">Unauthorized Access</h1>
      </div>
    </Route>;
  }

  return <Route path={path} component={Component} />;
}
