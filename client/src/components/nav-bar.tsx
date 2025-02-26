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
import { UserCircle, LogOut, Shield, Settings, CreditCard, Menu, Wallet } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";

export default function NavBar() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation('/auth');
        setMobileMenuOpen(false);
      }
    });
  };

  if (!user) {
    return null;
  }

  const navigationItems = (
    <div className="flex items-center gap-4">
      {/* Points Display */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20">
        <Wallet className="h-4 w-4" />
        <span className="text-sm font-medium">{user.loyaltyPoints} points</span>
      </div>

      {/* Admin Panel Button */}
      {user.role === "admin" && (
        <Button 
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 hover:bg-primary/10 transition-all duration-300"
          onClick={() => {
            setLocation('/admin');
            setMobileMenuOpen(false);
          }}
        >
          <Shield className="h-4 w-4" />
          <span>Admin Panel</span>
        </Button>
      )}

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2 hover:bg-primary/10 transition-all duration-300"
          >
            <UserCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{user.fullName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link 
              href="/settings" 
              className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-primary/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer text-destructive hover:text-destructive focus:text-destructive transition-colors hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link 
            href="/" 
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-transform hover:scale-[1.02] duration-300"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              USDT Exchange
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {navigationItems}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 transition-colors hover:bg-primary/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-3/4 max-w-sm">
                <div className="flex flex-col gap-4 mt-8">
                  {navigationItems}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}