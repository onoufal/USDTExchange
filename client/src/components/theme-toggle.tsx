import { Moon, Sun, Laptop } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 relative overflow-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="flex items-center gap-2 cursor-pointer focus:bg-accent focus:text-accent-foreground"
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="flex items-center gap-2 cursor-pointer focus:bg-accent focus:text-accent-foreground"
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="flex items-center gap-2 cursor-pointer focus:bg-accent focus:text-accent-foreground"
        >
          <Laptop className="h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}