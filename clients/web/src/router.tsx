import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import Dashboard from '@/routes/Dashboard';
import Home from '@/routes/Home';
import Login from '@/routes/Login';
import { useAppStore } from '@/store';

const apiBase = 'http://localhost:3000';

function AppLayout() {
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const navigate = useNavigate();

  const showNavbar = Boolean(session) && pathname !== '/login';

  async function logout() {
    await fetch(`${apiBase}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setSession(null);
    navigate({ to: '/login' });
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {showNavbar ? (
        <header className="w-full border-b bg-background/95 supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <h1 className="text-base font-semibold">MoneyUp</h1>
            <nav className="flex items-center gap-4">
              <Link className="text-sm font-medium transition-colors hover:text-primary" to="/dashboard">
                דשבורד
              </Link>
              <Link className="text-sm font-medium transition-colors hover:text-primary" to="/login">
                פרופילים
              </Link>
              <Button variant="destructive" size="sm" onClick={() => void logout()}>
                התנתקות
              </Button>
            </nav>
          </div>
        </header>
      ) : null}
      <div className="mx-auto max-w-7xl p-6">
        <Outlet />
      </div>
    </main>
  );
}

const rootRoute = createRootRoute({
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const session = useAppStore.getState().session;
    throw redirect({ to: session ? '/dashboard' : '/login' });
  },
  component: Home,
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

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, dashboardRoute]);

export const router = createRouter({ routeTree });

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
