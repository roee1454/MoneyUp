import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const premiumCardVariants = cva('transition-all duration-300 shadow-sm', {
  variants: {
    variant: {
      default: 'bg-card border border-border rounded-none p-5',
      warning: 'text-center bg-muted/30 border border-border p-3',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface PremiumCardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof premiumCardVariants> {}

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(premiumCardVariants({ variant, className }))}
        {...props}
      />
    );
  },
);
PremiumCard.displayName = 'PremiumCard';

export { PremiumCard, premiumCardVariants };
