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
  // All hooks at the top of the component, no conditional calls
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Event handlers after hooks
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation('/auth');
      }
    });
  };

  // Return early with null, but only after all hooks are called
  if (!user) {
    return null;
  }

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex items-center px-2 text-xl font-bold">
              <Link href="/">USDT Exchange</Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="mr-4">
              Points: {user.loyaltyPoints}
            </span>

            {user.role === "admin" && (
              <Button 
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setLocation('/admin')}
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </Button>
            )}

            <Button 
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <UserCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
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