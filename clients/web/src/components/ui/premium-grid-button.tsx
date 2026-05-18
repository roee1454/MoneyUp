import * as React from "react"
import { cn } from "@/lib/utils"

export interface PremiumGridButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
}

const PremiumGridButton = React.forwardRef<HTMLButtonElement, PremiumGridButtonProps>(
  ({ className, label, icon, ...props }, ref) => {
    return (
      <button
        type="button"
        className={cn(
          "w-full h-14 border border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all duration-350 cursor-pointer select-none text-right rounded-none",
          className
        )}
        ref={ref}
        {...props}
      >
        <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{label}</span>
        {icon && <div className="flex items-center justify-center shrink-0">{icon}</div>}
      </button>
    );
  }
)
PremiumGridButton.displayName = "PremiumGridButton"

export { PremiumGridButton }
