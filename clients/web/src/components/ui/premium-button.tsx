import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const premiumButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-xs font-black uppercase tracking-widest transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 border border-border shadow-sm active:scale-95 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 border-primary shadow-lg shadow-primary/10 animate-soft-shimmer',
        outline:
          'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        ghost:
          'bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground border-transparent',
        accent:
          'bg-accent text-accent-foreground hover:bg-accent/80 border-border/50',
      },
      size: {
        default: 'h-12 px-6',
        icon: 'h-12 w-12',
        sm: 'h-10 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface PremiumButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof premiumButtonVariants> {}

const PremiumButton = React.forwardRef<HTMLButtonElement, PremiumButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(premiumButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
PremiumButton.displayName = 'PremiumButton';

export { PremiumButton, premiumButtonVariants };
