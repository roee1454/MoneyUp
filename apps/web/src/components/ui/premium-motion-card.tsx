import * as React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

export interface PremiumMotionCardProps
  extends Omit<HTMLMotionProps<'div'>, 'onClick'> {
  asButton?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const PremiumMotionCard = React.forwardRef<HTMLElement, PremiumMotionCardProps>(
  (
    {
      className,
      asButton = false,
      onClick,
      disabled = false,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const isInteractive = asButton || !!onClick;

    // Use motion.button if it acts as a button, otherwise motion.div
    const Component = isInteractive ? motion.button : motion.div;

    const interactiveProps = isInteractive
      ? {
          type: type as any,
          disabled,
          onClick: disabled ? undefined : onClick,
        }
      : {};

    return (
      <Component
        ref={ref as any}
        whileHover={shouldReduceMotion || disabled || !isInteractive ? {} : { y: -4 }}
        whileTap={shouldReduceMotion || disabled || !isInteractive ? {} : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
        className={cn(
          'text-right border border-border bg-card p-5 transition-[background-color,border-color,box-shadow] duration-200 rounded-none shadow-sm',
          isInteractive && !disabled && 'cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/10',
          disabled && 'opacity-60 cursor-not-allowed',
          className,
        )}
        {...interactiveProps}
        {...(props as any)}
      >
        {children}
      </Component>
    );
  },
);

PremiumMotionCard.displayName = 'PremiumMotionCard';

export { PremiumMotionCard };
