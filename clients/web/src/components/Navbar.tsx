import { useState, useEffect } from "react";
import { List, SignOut } from '@phosphor-icons/react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { useLogout } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/BrandLogo';

const NAV_ITEMS = [
  { label: 'בית', to: '/dashboard' },
  { label: 'ייעוץ עם סוכן', to: '/ai-studio' },
  { label: 'ייצוא נתונים', to: '/export' },
  { label: 'הגדרות', to: '/settings' },
];

export function Navbar() {
  const [isHydrated, setIsHydrated] = useState(false);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  
  const session = useAppStore((s) => s.session);
  const logoutMutation = useLogout();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  async function logout() {
    await logoutMutation.mutateAsync();
  }

  const linkCls = (to: string) => cn(
    "text-sm font-semibold transition-colors duration-150",
    pathname === to
      ? "text-zinc-950 dark:text-white underline decoration-2 underline-offset-4"
      : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
  );

  return (
    <header role="banner" className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/80 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6"
        aria-label="ניווט ראשי"
        dir="rtl"
      >
        {/* Right side: Logo */}
        <BrandLogo variant="nav" to="/dashboard" />

        {/* Center: Main Links (Desktop) */}
        <ul className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.label}>
              <Link to={item.to} className={linkCls(item.to)}>{item.label}</Link>
            </li>
          ))}
        </ul>

        {/* Left side: Profile Actions / Mobile menu */}
        <div className="flex items-center gap-4">
          {isHydrated && session ? (
            <div className="hidden items-center gap-4 md:flex">
              <span className="text-xs font-semibold text-zinc-500">שלום, {session.username}</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 rounded-md border-zinc-200 dark:border-zinc-800 text-xs font-bold flex items-center gap-1.5 text-zinc-700 hover:text-red-600 hover:border-red-200 dark:text-zinc-300 dark:hover:text-red-400 transition-colors"
                onClick={() => void logout()}
              >
                <span>התנתקות</span>
                <SignOut className="h-3.5 w-3.5" weight="duotone" />
              </Button>
            </div>
          ) : (
            <Link to="/login" className="hidden text-sm font-semibold text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white md:inline-block">
              התחברות
            </Link>
          )}

          {/* Mobile Navigation Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 border border-zinc-200 dark:border-zinc-800 rounded-md" aria-label="תפריט ניווט">
                <List className="h-4 w-4" weight="bold" />
              </Button>
            </SheetTrigger>
            <SheetContent showCloseButton={false} side="left" className="flex w-[260px] flex-col bg-white dark:bg-zinc-950 p-6 border-l border-zinc-200 dark:border-zinc-800" dir="rtl">
              <SheetHeader className="text-start pb-4 border-b border-zinc-100 dark:border-zinc-900">
                <SheetTitle className="text-base font-black text-zinc-950 dark:text-white">תפריט ראשי</SheetTitle>
              </SheetHeader>
              
              <ul className="flex flex-col gap-4 pt-6">
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <Link 
                      to={item.to} 
                      className={cn(
                        "block text-base font-semibold py-1 transition-colors",
                        pathname === item.to 
                          ? "text-zinc-950 dark:text-white" 
                          : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-auto border-t border-zinc-100 dark:border-zinc-900 pt-6">
                {isHydrated && session ? (
                  <div className="space-y-4">
                    <div className="text-xs text-zinc-500 font-semibold">מחובר כ: <span className="font-bold text-zinc-800 dark:text-zinc-200">{session.username}</span></div>
                    <Button 
                      variant="outline" 
                      className="h-10 w-full rounded-md text-sm font-semibold border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-white"
                      onClick={() => void logout()}
                    >
                      <span>התנתקות מהמערכת</span>
                    </Button>
                  </div>
                ) : (
                  <Button className="h-10 w-full rounded-md text-sm font-bold bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm" asChild>
                    <Link to="/login">התחברות</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
