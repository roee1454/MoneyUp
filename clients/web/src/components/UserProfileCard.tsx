import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SignOut, Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface UserProfileCardProps {
  username?: string;
  onLogout: () => void;
  className?: string;
}

export function UserProfileCard({
  username,
  onLogout,
  className,
}: UserProfileCardProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = String(username ?? 'U')
    .slice(0, 1)
    .toUpperCase();

  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className={cn(
        'flex items-center justify-between border border-border bg-card p-2 group transition-all hover:border-foreground/20',
        className,
      )}
      dir="rtl"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="h-9 w-9 border border-border shrink-0">
          <AvatarFallback className="bg-muted text-[11px] font-black text-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex flex-col text-right">
          <p className="truncate text-xs font-black text-foreground leading-none mb-1">
            {username ?? 'משתמש'}
          </p>
          <p className="truncate text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
            מחובר למערכת
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label="החלפת מצב תצוגה"
          >
            {isDark ? (
              <Sun className="h-4 w-4" weight="bold" />
            ) : (
              <Moon className="h-4 w-4" weight="bold" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-none text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
          title="התנתקות"
        >
          <SignOut className="h-4 w-4" weight="bold" />
        </Button>
      </div>
    </div>
  );
}
