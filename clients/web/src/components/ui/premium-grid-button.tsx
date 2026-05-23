import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PremiumGridButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
}

const PremiumGridButton = React.forwardRef<
  HTMLButtonElement,
  PremiumGridButtonProps
>(({ className, label, icon, ...props }, ref) => {
  return (
    <button
      type="button"
      className={cn(
        'w-full h-14 border border-border px-4 flex items-center justify-between hover:border-primary/50 hover:bg-accent transition-all duration-350 cursor-pointer select-none text-right rounded-none bg-card',
        className,
      )}
      ref={ref}
      {...props}
    >
      <span className="text-sm font-black text-foreground">{label}</span>
      {icon && (
        <div className="flex items-center justify-center shrink-0">{icon}</div>
      )}
    </button>
  );
});
PremiumGridButton.displayName = 'PremiumGridButton';

export { PremiumGridButton };
