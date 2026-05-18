import * as React from "react"
import { cn } from "@/lib/utils"

export interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "warning";
}

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        className={cn(
          variant === "warning"
            ? "text-center bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 p-3"
            : "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none p-5 shadow-sm transition-all duration-300",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
)
PremiumCard.displayName = "PremiumCard"

export { PremiumCard }
