import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, LogOut, Shield, Settings, CreditCard } from "lucide-react";

export default function NavBar() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation('/auth');
      }
    });
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="sr-only">Your Logo Here</span>
            </div>
            <Link 
              href="/" 
              className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent hover:to-primary/80 transition-all"
            >
              [Your Brand]
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Points: {user.loyaltyPoints}
            </span>

            {user.role === "admin" && (
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 hover:bg-primary/10 transition-colors"
                onClick={() => setLocation('/admin')}
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin Panel</span>
              </Button>
            )}

            <Button 
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 transition-colors">
                  <UserCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}