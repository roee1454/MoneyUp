import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import Dashboard from '@/routes/Dashboard';
import Introduction from '@/routes/Introduction';
import Login from '@/routes/Login';
import Export from '@/routes/Export';
import AiStudio from '@/routes/AiStudio';
import Settings from '@/routes/Settings';

import { useState, useEffect } from 'react';
import { useRouterState, useNavigate } from '@tanstack/react-router';
import { useAppStore } from '@/store';
import { Navbar } from '@/components/Navbar';
import { useSession } from '@/hooks/useAuth';
import { useGlobalSyncManager } from '@/hooks/useGlobalSync';
import { GlobalSyncBubble } from '@/components/GlobalSyncBubble';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemeProvider } from '@/components/ThemeProvider';

const privatePaths = ['/dashboard', '/export', '/ai-studio', '/settings'];

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
          : 'min-h-screen bg-background text-foreground transition-colors duration-300'
      }
    >
      {!showNavbar && (
        <div className="fixed top-4 left-4 z-50">
          <ThemeToggle />
        </div>
      )}
      {showNavbar && <Navbar />}
      {showNavbar ? (
        <div className="min-h-0 flex-1 overflow-y-auto md:pr-72">
          <div className="mx-auto max-w-7xl p-6">
            <Outlet />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl p-6">
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

const exportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/export',
  component: Export,
});

const aiStudioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai-studio',
  component: AiStudio,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute,
  exportRoute,
  aiStudioRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree });

export function AppRouterProvider() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
