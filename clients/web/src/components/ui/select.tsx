import * as React from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type SelectItemProps = {
  value: string;
  children: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
};

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
}

export function Select({
  value,
  onValueChange,
  placeholder,
  children,
  className,
  position = 'bottom',
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedChild = React.useMemo(() => {
    let found: React.ReactNode = null;
    React.Children.forEach(children, (child) => {
      if (
        React.isValidElement<SelectItemProps>(child) &&
        child.type === SelectItem &&
        child.props.value === value
      ) {
        found = child.props.children;
      }
    });
    return found;
  }, [children, value]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-12 w-full items-center justify-between border border-border bg-muted/30 hover:bg-muted/50 px-4 py-2 text-sm font-semibold transition-all duration-300 cursor-pointer rounded-none text-right text-foreground hover:border-muted-foreground/30 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-border shadow-sm',
          open && 'bg-card border-border/80 ring-4 ring-primary/5',
          className,
        )}
        dir="rtl"
      >
        <span className={cn('w-full flex items-center justify-start gap-2', !selectedChild && 'text-muted-foreground')}>
          {selectedChild ? selectedChild : placeholder || 'בחר...'}
        </span>
        <CaretDown className={cn("h-4 w-4 opacity-50 shrink-0 transition-transform duration-300", open && "rotate-180")} weight="bold" />
      </button>

      {open && (
        <div className={cn(
          "absolute z-50 min-w-32 overflow-hidden border border-border bg-card/95 backdrop-blur-md text-foreground shadow-xl animate-in fade-in-50 zoom-in-95 duration-200 w-full max-h-60 overflow-y-auto custom-scrollbar",
          position === 'top' ? 'bottom-full mb-1.5' : 'mt-1.5',
          className?.includes('rounded-full') || className?.includes('rounded-md') ? 'rounded-lg' : 'rounded-none'
        )}>
          <div className="p-1">
            {React.Children.map(children, (child) => {
              if (
                React.isValidElement<SelectItemProps>(child) &&
                child.type === SelectItem
              ) {
                const isSelected = child.props.value === value;
                return React.cloneElement(child, {
                  isSelected,
                  onClick: () => {
                    onValueChange(child.props.value);
                    setOpen(false);
                  },
                });
              }
              return child;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SelectItem({
  children,
  isSelected,
  onClick,
  className,
}: SelectItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center py-2.5 pl-8 pr-3 text-xs font-semibold outline-none hover:bg-accent/70 hover:text-foreground transition-all duration-200 text-right rounded-none text-muted-foreground',
        isSelected && 'bg-primary/5 text-foreground font-black',
        className,
      )}
    >
      <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && (
          <Check className="h-3.5 w-3.5 text-primary animate-in zoom-in-50 duration-200" weight="bold" />
        )}
      </span>
      <span className="truncate w-full">{children}</span>
    </button>
  );
}
