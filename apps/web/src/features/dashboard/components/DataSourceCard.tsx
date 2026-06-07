import { BankIcon } from '@/features/accounts/components/BankIcon';
import { cn } from '@/lib/utils';

interface DataSourceCardProps {
  bankIds: string[];
  className?: string;
  label?: string;
}

export function DataSourceCard({
  bankIds,
  className,
  label = 'מקורות',
}: DataSourceCardProps) {
  if (bankIds.length === 0) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 border border-border bg-muted/30 px-1.5 py-0.5 shadow-xs',
        className,
      )}
    >
      <span className="text-xs uppercase font-black tracking-tight text-muted-foreground/80 leading-none">
        {label}:
      </span>
      <div className="flex -space-x-1.5">
        {bankIds.map((id, idx) => (
          <BankIcon
            key={`${id}-${idx}`}
            bankId={id}
            size="sm"
            className="relative h-4 w-4 border-background shadow-xs ring-1 ring-background shrink-0"
            shape='circle'
            style={{ zIndex: bankIds.length - idx }}
          />
        ))}
      </div>
    </div>
  );
}
