import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, LogOut, Shield } from "lucide-react";

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
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold truncate">
              USDT Exchange
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:inline text-sm">
              Points: {user.loyaltyPoints}
            </span>

            {user.role === "admin" && (
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center gap-1 sm:gap-2"
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
              className="flex items-center gap-1 sm:gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <UserCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}