import { Outlet, Link, useRouterState } from '@tanstack/react-router';
import { CircleNotch } from '@phosphor-icons/react';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';

const BREADCRUMBS = [
  { label: 'חשבונות', to: '/settings' },
  { label: 'בינה מלאכותית', to: '/settings/ai' },
  { label: 'סורקים', to: '/settings/scrapers' },
];

export default function Settings() {
  const session = useAppStore((s) => s.session);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const { isLoading: isLoadingProfile } = useUserProfile(session?.userId);

  if (isLoadingProfile) {
    return (
      <div
        className="h-[60vh] flex items-center justify-center text-center animate-in fade-in-50 duration-300"
        dir="rtl"
      >
        <div className="flex flex-col items-center gap-3">
          <CircleNotch className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">
            טוען הגדרות מערכת...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-4xl mx-auto space-y-8 text-right animate-in fade-in-50 duration-500"
      dir="rtl"
    >
      {/* Tab-like Navigation for settings */}
      <nav className="flex items-center text-[10px] font-black uppercase tracking-widest border-b border-border pb-4">
        <div className="flex items-center gap-6">
          {BREADCRUMBS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'transition-colors text-muted-foreground/60 hover:text-foreground py-2 border-b-2 -mb-[18px]',
                pathname === item.to
                  ? 'text-primary border-primary'
                  : 'border-transparent',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  );
}
