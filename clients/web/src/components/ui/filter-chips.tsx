import { cn } from '@/lib/utils';

export interface FilterChipOption {
  id: string;
  label: string;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function FilterChips({
  options,
  selectedIds,
  onChange,
  allLabel = 'All',
  disabled = false,
  className,
}: FilterChipsProps) {
  const selected = new Set(selectedIds);
  const allSelected = selected.size === 0;

  function toggleOption(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(Array.from(next));
  }

  return (
    <div className={cn('overflow-x-auto pb-1', className)}>
      <div className="flex min-w-max items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([])}
          className={cn(
            'h-8 whitespace-nowrap border px-3 text-[11px] font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
            allSelected
              ? 'border-border bg-primary text-primary-foreground shadow-md'
              : 'border-border text-muted-foreground hover:bg-muted bg-muted/30',
          )}
        >
          {allLabel}
        </button>
        {options.map((option) => {
          const isActive = selected.has(option.id);
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => toggleOption(option.id)}
              className={cn(
                'h-8 whitespace-nowrap border px-3 text-[11px] font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
                isActive
                  ? 'border-border bg-primary text-primary-foreground shadow-md'
                  : 'border-border text-muted-foreground hover:bg-muted bg-muted/30',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
