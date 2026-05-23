import { useEffect, useState } from 'react';
import {
  CircleNotch,
  List,
  SignOut,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { useLogout } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/BrandLogo';
import { useSyncAccounts } from '@/hooks/useAccounts';
import { AiGlobalSwitcher } from '@/components/AiGlobalSwitcher';

const NAV_ITEMS = [
  { label: 'בית', to: '/dashboard' },
  { label: 'ייעוץ עם סוכן', to: '/ai-studio' },
  { label: 'ייצוא נתונים', to: '/export' },
  { label: 'הגדרות', to: '/settings' },
];

type SidebarContentProps = {
  pathname: string;
  username?: string;
  isDashboard: boolean;
  isSyncing: boolean;
  isSyncPending: boolean;
  onSync: () => void;
  onLogout: () => void;
};

function SidebarContent({
  pathname,
  username,
  isDashboard,
  isSyncing,
  isSyncPending,
  onSync,
  onLogout,
}: SidebarContentProps) {
  const isSyncBusy = isSyncing || isSyncPending;
  const initials = String(username ?? 'U').slice(0, 1).toUpperCase();

  return (
    <div className="flex h-full flex-col" dir="rtl">
      <div className="space-y-5">
        <div className="flex w-full justify-center py-1">
          <BrandLogo variant="nav" to="/dashboard" className="text-2xl md:text-3xl" />
        </div>
        <div className="px-1">
          <AiGlobalSwitcher />
        </div>
        <Separator className="bg-zinc-200 dark:bg-zinc-800" />

        <nav aria-label="ניווט ראשי">
          <ul className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      'flex h-10 items-center justify-between border px-3 text-sm font-bold transition-colors',
                      active
                        ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950'
                        : 'border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-white',
                    )}
                  >
                    <span>{item.label}</span>
                    {active ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {isDashboard ? (
          <div className="space-y-2">
            <Separator className="bg-zinc-200 dark:bg-zinc-800" />
            <Button
              variant="outline"
              className="h-10 w-full rounded-none border-zinc-200 text-sm font-black text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
              disabled={isSyncBusy}
              onClick={onSync}
            >
              {isSyncBusy ? (
                <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
              ) : (
                <ArrowsClockwise className="h-4 w-4" weight="bold" />
              )}
              <span>{isSyncBusy ? 'מסנכרן...' : 'סנכרן דשבורד'}</span>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-auto space-y-4">
        <Separator className="bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-3 border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
          <Avatar className="h-9 w-9 border border-zinc-200 dark:border-zinc-800">
            <AvatarFallback className="bg-white text-xs font-black text-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              פרופיל מחובר
            </p>
            <p className="truncate text-sm font-black text-zinc-950 dark:text-white">
              {username ?? 'משתמש'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="h-10 w-full rounded-none border-zinc-200 text-sm font-bold text-zinc-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-red-900 dark:hover:bg-red-950/20 dark:hover:text-red-400"
          onClick={onLogout}
        >
          <span>התנתקות</span>
          <SignOut className="h-4 w-4" weight="duotone" />
        </Button>
      </div>
    </div>
  );
}

export function Navbar() {
  const [isHydrated, setIsHydrated] = useState(false);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const session = useAppStore((s) => s.session);
  const sync = useAppStore((s) => s.sync);
  const dashboardRange = useAppStore((s) => s.dashboardRange);
  const logoutMutation = useLogout();
  const syncMutation = useSyncAccounts();
  const isDashboard = pathname === '/dashboard';
  const isSyncing = sync.status === 'running' || sync.status === 'reconnecting';

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  async function logout() {
    await logoutMutation.mutateAsync();
  }

  async function syncDashboardRange() {
    await syncMutation.mutateAsync({
      startDate:
        dashboardRange.committedStartDate ??
        dashboardRange.startDate ??
        undefined,
      endDate:
        dashboardRange.committedEndDate ??
        dashboardRange.endDate ??
        undefined,
    });
  }

  if (!isHydrated || !session) return null;

  const sidebar = (
    <SidebarContent
      pathname={pathname}
      username={session.username}
      isDashboard={isDashboard}
      isSyncing={isSyncing}
      isSyncPending={syncMutation.isPending}
      onSync={() => void syncDashboardRange()}
      onLogout={() => void logout()}
    />
  );

  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-72 border-l border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:block">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85 md:hidden" dir="rtl">
        <div className="flex items-center justify-between">
          <BrandLogo variant="nav" to="/dashboard" />
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-md border border-zinc-200 dark:border-zinc-800"
                aria-label="פתיחת תפריט ניווט"
              >
                <List className="h-4 w-4" weight="bold" />
              </Button>
            </SheetTrigger>
            <SheetContent
              showCloseButton={false}
              side="left"
              className="flex w-[280px] flex-col border-l border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              dir="rtl"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>תפריט ראשי</SheetTitle>
              </SheetHeader>
              {sidebar}
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
