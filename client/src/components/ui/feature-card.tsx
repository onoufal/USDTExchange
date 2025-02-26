import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  className?: string;
  icon?: LucideIcon;
}

/**
 * A reusable card component for displaying features or benefits
 * with consistent styling and hover effects.
 */
export function FeatureCard({ title, description, className, icon: Icon }: FeatureCardProps) {
  return (
    <div className={cn(
      "p-6 rounded-lg bg-card/50 backdrop-blur border border-border/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
      className
    )}>
      {Icon && (
        <div className="mb-4">
          <Icon className="h-8 w-8 text-primary/80" />
        </div>
      )}
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}