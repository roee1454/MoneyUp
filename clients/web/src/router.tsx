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
  }, [sessionQuery.isLoading, sessionQuery.data, setSession]);

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
  }, [session, isLoadingSession, routerState.location.pathname, navigate, isHydrated]);

  const showNavbar = isHydrated && !isLoadingSession && session && privatePaths.includes(routerState.location.pathname);
  useGlobalSyncManager(Boolean(isHydrated && !isLoadingSession && session));

  if (isHydrated && isLoadingSession) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 flex items-center justify-center" dir="rtl">
        <div className="text-sm font-semibold text-zinc-500">טוען נתוני סשן...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-300">
      {showNavbar && <Navbar />}
      <div className="mx-auto max-w-7xl p-6">
        <Outlet />
      </div>
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
  return <RouterProvider router={router} />;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
