import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const premiumGridButtonVariants = cva(
  'w-full h-14 border border-border px-4 flex items-center justify-between hover:border-border/50 hover:bg-accent transition-all duration-350 cursor-pointer select-none text-right rounded-none bg-card',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface PremiumGridButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof premiumGridButtonVariants> {
  label: string;
  icon?: React.ReactNode;
}

const PremiumGridButton = React.forwardRef<
  HTMLButtonElement,
  PremiumGridButtonProps
>(({ className, label, icon, variant, ...props }, ref) => {
  return (
    <button
      type="button"
      ref={ref}
      className={cn(premiumGridButtonVariants({ variant, className }))}
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

export { PremiumGridButton, premiumGridButtonVariants };
