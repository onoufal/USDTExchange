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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import NotificationBell from "./notification-bell";

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

  const navigationItems = (isMobile: boolean) => (
    <div 
      className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-4`}
      role={isMobile ? 'menu' : undefined}
    >
      {/* Points Display */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors duration-200"
              role="status"
              aria-label="Loyalty Points"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium tracking-tight">{user.loyaltyPoints} points</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-3 max-w-xs">
            <p className="text-sm">
              Earn loyalty points for each successful trade. Points can be used for fee discounts and special promotions.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Admin Panel Button */}
      {user.role === "admin" && (
        <Button 
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 font-medium transition-colors duration-200 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            isMobile ? 'w-full justify-start min-h-[44px]' : ''
          }`}
          onClick={() => {
            setLocation('/admin');
            setMobileMenuOpen(false);
          }}
          aria-label="Admin Panel"
        >
          <Shield className="h-4 w-4" aria-hidden="true" />
          <span>Admin Panel</span>
        </Button>
      )}

      {/* Settings Link - Only show in mobile menu */}
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start font-medium transition-colors duration-200 hover:bg-primary/10 min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => {
            setLocation('/settings');
            setMobileMenuOpen(false);
          }}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
          Settings
        </Button>
      )}

      {/* Notification Bell */}
      <NotificationBell />

      {/* Theme Toggle */}
      <div className={isMobile ? 'w-full' : ''}>
        <ThemeToggle />
      </div>

      {/* Sign Out Button - Only show in mobile menu */}
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-destructive hover:text-destructive focus:text-destructive hover:bg-destructive/10 transition-all duration-200 min-h-[44px] focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
          aria-label="Sign Out"
        >
          <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
          Sign Out
        </Button>
      )}

      {/* User Menu - Only show on desktop */}
      {!isMobile && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2 font-medium hover:bg-primary/10 transition-all duration-200 min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="User menu"
            >
              <UserCircle className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{user.fullName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link 
                href="/settings" 
                className="flex items-center gap-2 cursor-pointer font-medium transition-colors duration-200 hover:bg-primary/10 focus:bg-primary/15 focus:outline-none min-h-[40px]"
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="flex items-center gap-2 cursor-pointer font-medium text-destructive hover:text-destructive focus:text-destructive transition-colors duration-200 hover:bg-destructive/10 focus:bg-destructive/15 min-h-[40px]"
              onClick={handleLogout}
              role="menuitem"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <nav 
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo/Brand with improved touch target */}
          <Link 
            href="/" 
            className="flex items-center gap-2 group min-h-[48px] px-2 -ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-transform hover:scale-[1.02] duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="USDT Exchange Home"
          >
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20">
              <CreditCard className="w-4 sm:w-5 h-4 sm:h-5 text-primary" aria-hidden="true" />
            </div>
            <span className="text-base sm:text-lg font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              USDT Exchange
            </span>
          </Link>

          {/* Desktop Navigation with improved focus states */}
          <div className="hidden md:flex items-center gap-4">
            {navigationItems(false)}
          </div>

          {/* Mobile Navigation with larger touch targets */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 transition-colors duration-200 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-[85%] max-w-sm border-l border-border/40"
              >
                <div className="mt-6 flex flex-col gap-6">
                  {/* Mobile user info */}
                  <div className="flex items-center gap-3 min-h-[48px]">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium tracking-tight text-foreground">{user.fullName}</span>
                      <span className="text-sm text-muted-foreground">{user.username}</span>
                    </div>
                  </div>
                  <div className="border-t border-border/40" role="separator" />
                  {/* Navigation items with consistent touch targets */}
                  {navigationItems(true)}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}