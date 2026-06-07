import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-10 border border-border bg-card" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-none border border-border bg-card"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="החלפת מצב תצוגה"
    >
      {isDark ? (
        <Sun className="h-4 w-4" weight="bold" />
      ) : (
        <Moon className="h-4 w-4" weight="bold" />
      )}
    </Button>
  );
}
