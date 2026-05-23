import * as React from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface PremiumInputProps extends React.ComponentProps<'input'> {
  isPassword?: boolean;
}

const PremiumInput = React.forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ className, type = 'text', isPassword = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="relative w-full">
        <input
          type={inputType}
          className={cn(
            'flex w-full h-12 bg-muted/30 hover:bg-muted/50 border border-border rounded-none focus:bg-card focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary focus:ring-4 focus:ring-primary/5 font-semibold text-sm transition-all duration-300 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 text-foreground placeholder:text-muted-foreground',
            isPassword ? 'pl-12 pr-4' : 'px-4',
            className,
          )}
          ref={ref}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
          >
            {showPassword ? (
              <EyeSlash className="h-4.5 w-4.5" weight="duotone" />
            ) : (
              <Eye className="h-4.5 w-4.5" weight="duotone" />
            )}
          </button>
        )}
      </div>
    );
  },
);
PremiumInput.displayName = 'PremiumInput';

export { PremiumInput };
