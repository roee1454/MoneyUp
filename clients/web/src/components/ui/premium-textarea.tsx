import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const premiumTextareaVariants = cva(
  'flex w-full min-h-12 bg-muted/30 hover:bg-muted/50 border border-border rounded-none focus:bg-card focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-border focus:ring-4 focus:ring-primary/5 font-semibold text-sm transition-all duration-300 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 text-foreground placeholder:text-muted-foreground resize-none py-3 custom-scrollbar',
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

export interface PremiumTextareaProps
  extends
    React.ComponentProps<'textarea'>,
    VariantProps<typeof premiumTextareaVariants> {}

const PremiumTextarea = React.forwardRef<HTMLTextAreaElement, PremiumTextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea
        className={cn(premiumTextareaVariants({ variant }), 'px-4', className)}
        ref={ref}
        {...props}
      />
    );
  },
);
PremiumTextarea.displayName = 'PremiumTextarea';

export { PremiumTextarea, premiumTextareaVariants };
