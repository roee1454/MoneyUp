import { Outlet, Link, useRouterState } from '@tanstack/react-router';
import { CircleNotch, CaretLeft } from '@phosphor-icons/react';
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
      className="max-w-6xl mx-auto space-y-8 text-right animate-in fade-in-50 duration-500"
      dir="rtl"
    >
      {/* Mini Breadcrumb Navbar */}
      <nav className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border pb-4">
        <Link
          to="/settings"
          className="hover:text-foreground transition-colors"
        >
          הגדרות
        </Link>
        <CaretLeft className="h-2.5 w-2.5" />
        {BREADCRUMBS.map((crumb) => {
          const active = pathname === crumb.to;
          if (!active && pathname !== '/settings' && crumb.to === '/settings')
            return null; // Only show 'חשבונות' if active or on main settings
          if (active) {
            return (
              <span key={crumb.to} className="text-foreground">
                {crumb.label}
              </span>
            );
          }
          return null;
        })}

        {/* Horizontal Tab-like Navigation for settings */}
        <div className="mr-auto flex items-center gap-4">
          {BREADCRUMBS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'transition-colors hover:text-foreground',
                pathname === item.to
                  ? 'text-primary underline underline-offset-8 decoration-2'
                  : '',
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
