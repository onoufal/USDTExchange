import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  className?: string;
}

/**
 * A reusable card component for displaying features or benefits
 * with consistent styling and hover effects.
 */
export function FeatureCard({ title, description, className }: FeatureCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-lg bg-card/50 backdrop-blur border border-border/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
      className
    )}>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
