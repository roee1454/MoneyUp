import { Trash, Lock } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { User } from '@/hooks/useUsers';

const avatarGrays = [
  'bg-primary text-primary-foreground border-border',
  'bg-muted text-foreground border-border',
  'bg-accent text-accent-foreground border-border',
  'bg-secondary text-secondary-foreground border-border',
  'bg-zinc-200 text-zinc-900 border-zinc-400',
];

interface ProfileCardProps {
  user: User;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDeleteClick: () => void;
}

export function ProfileCard({
  user,
  index,
  isSelected,
  onSelect,
  onDeleteClick,
}: ProfileCardProps) {
  return (
    <div className="group relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick();
        }}
        className="absolute -top-2 -left-2 z-20 h-8 w-8 rounded-none border border-destructive/20 bg-background text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-white flex items-center justify-center cursor-pointer shadow-sm"
        aria-label={`Delete ${user.username}`}
      >
        <Trash className="h-4 w-4" weight="bold" />
      </button>

      <button
        className={cn(
          'w-full text-right transition-all duration-300 cursor-pointer outline-none border border-border bg-card p-5 flex flex-col justify-between h-44 hover:border-foreground/20 hover:shadow-xl active:scale-95',
          isSelected &&
            'border-primary ring-1 ring-primary/20 bg-primary/5 shadow-lg shadow-primary/5',
        )}
        onClick={onSelect}
      >
        <div className="flex justify-between items-start">
          <div
            className={cn(
              'h-12 w-12 border border-border flex items-center justify-center text-xl font-black shadow-sm',
              avatarGrays[index % avatarGrays.length],
            )}
          >
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          {user.isLocked && (
            <div className="bg-muted p-1.5 border border-border shadow-xs">
              <Lock
                className="h-3.5 w-3.5 text-muted-foreground"
                weight="bold"
              />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-lg font-black text-foreground uppercase truncate">
            {user.username}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
            פרופיל מקומי
          </p>
        </div>
      </button>
    </div>
  );
}
