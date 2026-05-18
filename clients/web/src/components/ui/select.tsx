import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

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
}

export function Select({ value, onValueChange, placeholder, children, className }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const items = React.useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement<SelectItemProps>(child) && child.type === SelectItem) {
        list.push({
          value: child.props.value,
          label: child.props.children as string,
        });
      }
    });
    return list;
  }, [children]);

  const selectedItem = items.find((item) => item.value === value);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-white transition-all cursor-pointer rounded-none text-right"
        dir="rtl"
      >
        <span className={cn(!selectedItem && "text-zinc-500")}>
          {selectedItem ? selectedItem.label : placeholder || "בחר..."}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 min-w-32 overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-md animate-in fade-in-80 slide-in-from-top-1 w-full mt-1 max-h-60 overflow-y-auto rounded-none">
          <div className="p-1">
            {React.Children.map(children, (child) => {
              if (React.isValidElement<SelectItemProps>(child) && child.type === SelectItem) {
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
        "relative flex w-full cursor-pointer select-none items-center py-1.5 pl-8 pr-2 text-xs font-semibold outline-none hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-right rounded-none",
        isSelected && "bg-zinc-100/50 dark:bg-zinc-900/50",
        className
      )}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-3.5 w-3.5 text-zinc-950 dark:text-zinc-50" />}
      </span>
      <span className="truncate w-full">{children}</span>
    </button>
  );
}
