import * as React from 'react';
import { cn } from '@/lib/utils';

function Avatar({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('relative flex shrink-0 overflow-hidden', className)} {...props} />;
}

function AvatarFallback({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex h-full w-full items-center justify-center', className)} {...props} />;
}

export { Avatar, AvatarFallback };
