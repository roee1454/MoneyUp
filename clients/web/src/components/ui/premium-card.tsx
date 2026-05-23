import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'warning';
}

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        className={cn(
          variant === 'warning'
            ? 'text-center bg-muted/30 border border-border p-3'
            : 'bg-card border border-border rounded-none p-5 shadow-sm transition-all duration-300',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
PremiumCard.displayName = 'PremiumCard';

export { PremiumCard };
