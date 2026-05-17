import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
