import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  createHashHistory,
} from '@tanstack/react-router';
import Dashboard from '@/routes/Dashboard';
import Introduction from '@/routes/Introduction';
import Login from '@/routes/Login';
import Export from '@/routes/Export';
import Agent from '@/routes/Agent';
import Settings from '@/routes/Settings';
import AccountsSettings from '@/routes/settings/Accounts';
import AiSettings from '@/routes/settings/Ai';
import ScrapersSettings from '@/routes/settings/Scrapers';
// import { InvestmentsRoute } from '@/routes/InvestmentsRoute';

import { useState, useEffect } from 'react';
import { useRouterState, useNavigate } from '@tanstack/react-router';
import { useAppStore } from '@/store';
import { Navbar } from '@/components/Navbar';
import { useSession } from '@/hooks/useAuth';
import { useGlobalSyncManager } from '@/hooks/useGlobalSync';
import { GlobalSyncBubble } from '@/features/accounts/components/GlobalSyncBubble';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { PremiumAnimatedBackground } from '@/components/ui/premium-animated-background';


const privatePaths = [
  '/dashboard',
  '/export',
  '/ai-studio',
  '/settings',
  '/settings/ai',
  '/settings/scrapers',
];

function AppLayout() {
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const routerState = useRouterState();
  const navigate = useNavigate();
  const [isHydrated, setIsHydrated] = useState(false);
  const sessionQuery = useSession();
  const isLoadingSession = sessionQuery.isLoading;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!sessionQuery.isLoading) {
      setSession(sessionQuery.data?.user ?? null);
    }
  }, [sessionQuery.data, sessionQuery.isLoading, setSession]);

  useEffect(() => {
    if (!isHydrated || isLoadingSession) return;

    const path = routerState.location.pathname;

    if (path === '/investments') {
      void navigate({ to: session ? '/dashboard' : '/login' });
      return;
    }

    if (session) {
      if (path === '/login' || path === '/') {
        void navigate({ to: '/dashboard' });
      }
    } else {
      if (privatePaths.includes(path)) {
        void navigate({ to: '/login' });
      }
    }
  }, [
    session,
    isLoadingSession,
    routerState.location.pathname,
    navigate,
    isHydrated,
  ]);

  const showNavbar =
    isHydrated &&
    !isLoadingSession &&
    session &&
    privatePaths.includes(routerState.location.pathname);
  useGlobalSyncManager(Boolean(isHydrated && !isLoadingSession && session));

  useEffect(() => {
    if (!showNavbar || typeof document === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [showNavbar]);

  if (isHydrated && isLoadingSession) {
    return (
      <main
        className="min-h-screen bg-background text-foreground flex items-center justify-center"
        dir="rtl"
      >
        <div className="text-sm font-semibold text-muted-foreground">
          טוען נתוני סשן...
        </div>
      </main>
    );
  }

  return (
    <main
      className={
        showNavbar
          ? 'flex h-dvh flex-col overflow-hidden bg-background text-foreground transition-colors duration-300'
          : 'min-h-screen bg-background text-foreground transition-colors duration-300 relative'
      }
    >
      {!showNavbar && (
        <div className="fixed top-4 left-4 z-50">
          <ThemeToggle />
        </div>
      )}
      {!showNavbar && (
        <PremiumAnimatedBackground
          count={5}
          types={['circle', 'square', 'triangle', 'hexagon', 'pentagon']}
        />
      )}
      {showNavbar && <Navbar />}
      {showNavbar ? (
        <div
          className={cn(
            'min-h-0 flex-1 flex flex-col lg:pr-72',
            routerState.location.pathname === '/ai-studio'
              ? 'overflow-hidden'
              : 'overflow-y-auto',
          )}
        >
          <div
            className={cn(
              'mx-auto w-full flex-1 flex flex-col min-h-0',
              routerState.location.pathname === '/ai-studio'
                ? 'max-w-none px-0 py-0 h-full'
                : 'max-w-7xl px-4 py-4 md:px-8 md:py-6 lg:px-10 lg:py-8',
            )}
          >
            <Outlet />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl p-6 relative z-10">
          <Outlet />
        </div>
      )}
      <GlobalSyncBubble />
    </main>
  );
}

const rootRoute = createRootRoute({
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Introduction,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
});

// const investmentsRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/investments',
//   component: InvestmentsRoute,
// });

const exportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/export',
  component: Export,
});

const aiStudioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai-studio',
  component: Agent,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
});

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  component: AccountsSettings,
});

const settingsAiRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/ai',
  component: AiSettings,
});

const settingsScrapersRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/scrapers',
  component: ScrapersSettings,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute,
  // investmentsRoute,
  exportRoute,
  aiStudioRoute,
  settingsRoute.addChildren([
    settingsIndexRoute,
    settingsAiRoute,
    settingsScrapersRoute,
  ]),
]);

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const router = createRouter({
  routeTree,
  history: isTauri ? createHashHistory() : undefined,
});

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}