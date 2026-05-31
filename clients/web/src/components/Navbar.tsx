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
import { AiGlobalSwitcher } from '@/features/ai/components/AiGlobalSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  const initials = String(username ?? 'U')
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col" dir="rtl">
      <div className="space-y-5">
        <div className="flex w-full justify-center py-1">
          <BrandLogo
            variant="nav"
            to="/dashboard"
            className="text-2xl md:text-3xl"
          />
        </div>
        <div className="px-1">
          <AiGlobalSwitcher />
        </div>
        <Separator className="bg-border" />

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
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <span>{item.label}</span>
                    {active ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {isDashboard ? (
          <div className="space-y-2">
            <Separator className="bg-border" />
            <Button
              variant="outline"
              className="h-10 w-full rounded-none border-border text-sm font-black text-foreground/80 hover:bg-accent hover:text-foreground"
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
        <Separator className="bg-border" />
        <div className="flex items-center gap-3 border border-border bg-muted/50 p-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-background text-xs font-black text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-xs font-semibold text-muted-foreground">
              פרופיל מחובר
            </p>
            <p className="truncate text-sm font-black text-foreground">
              {username ?? 'משתמש'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            className="h-10 flex-1 rounded-none border-border text-sm font-bold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={onLogout}
          >
            <span>התנתקות</span>
            <SignOut className="h-4 w-4" weight="duotone" />
          </Button>
        </div>
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
        dashboardRange.committedEndDate ?? dashboardRange.endDate ?? undefined,
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
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-72 border-l border-border bg-background p-5 shadow-sm md:block">
        {sidebar}
      </aside>

      <header
        className="sticky top-0 z-50 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:hidden"
        dir="rtl"
      >
        <div className="flex items-center justify-between">
          <BrandLogo variant="nav" to="/dashboard" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-md border border-border"
                  aria-label="פתיחת תפריט ניווט"
                >
                  <List className="h-4 w-4" weight="bold" />
                </Button>
              </SheetTrigger>

              <SheetContent
                showCloseButton={false}
                side="left"
                className="flex w-[280px] flex-col border-l border-border bg-background p-5"
                dir="rtl"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>תפריט ראשי</SheetTitle>
                </SheetHeader>
                {sidebar}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
