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
import { UserCircle, LogOut, Shield, Settings, CreditCard, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { useTranslation } from "react-i18next";

export default function NavBar() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

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
    <>
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary transition-colors hover:bg-primary/20">
        Points: {user.loyaltyPoints}
      </span>

      {user.role === "admin" && (
        <Button 
          variant="outline"
          size="sm"
          className="flex items-center gap-2 hover:bg-primary/10 transition-all duration-300 hover:scale-[1.02]"
          onClick={() => {
            setLocation('/admin');
            setMobileMenuOpen(false);
          }}
        >
          <Shield className="h-4 w-4" />
          <span>Admin Panel</span>
        </Button>
      )}

      <Button 
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive transition-all duration-300 hover:scale-[1.02]"
      >
        <LogOut className="h-4 w-4" />
        <span>{t('common.logout')}</span>
      </Button>

      <ThemeToggle />
      <LanguageToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-primary/10 transition-all duration-300 hover:scale-[1.02]"
            aria-label="User menu"
          >
            <UserCircle className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 animate-in fade-in-0 zoom-in-95 duration-200">
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
          <DropdownMenuItem asChild>
            <Link 
              href="/profile" 
              className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-primary/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              <UserCircle className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link 
              href="/" 
              className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg group transition-transform hover:scale-[1.02] duration-300"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="sr-only">Your Logo Here</span>
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent transition-all duration-300 group-hover:to-primary/80">
                [Your Brand]
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
            {navigationItems}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors hover:bg-primary/10" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-3/4 max-w-sm animate-in slide-in-from-right duration-300">
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