import { CreditCard } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
}

/**
 * A reusable brand logo component that displays a placeholder logo
 * with consistent styling and optional text.
 */
export function BrandLogo({ size = "md", withText = true, className }: BrandLogoProps) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-24 h-24"
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizes[size]} rounded-full bg-primary/10 flex items-center justify-center transition-transform hover:scale-105 duration-300`}>
        <CreditCard className={size === "lg" ? "w-12 h-12" : "w-6 h-6"} />
        <span className="sr-only">Your Logo Here</span>
      </div>
      {withText && (
        <span className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent transition-all duration-300 group-hover:to-primary/80">
          [Your Brand]
        </span>
      )}
    </div>
  );
}
