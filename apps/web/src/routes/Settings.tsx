import { Outlet, Link, useRouterState } from '@tanstack/react-router';
import { CircleNotch } from '@phosphor-icons/react';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion, type Variants } from 'motion/react';

const BREADCRUMBS = [
  { label: 'חשבונות', to: '/settings' },
  { label: 'בינה מלאכותית', to: '/settings/ai' },
  { label: 'סורקים', to: '/settings/scrapers' },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function Settings() {
  const session = useAppStore((s) => s.session);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const { isLoading: isLoadingProfile } = useUserProfile(session?.userId);
  const shouldReduceMotion = useReducedMotion();
  const isAnimated = !shouldReduceMotion;

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

  const LayoutContainer = isAnimated ? motion.div : 'div';
  const MotionItem = isAnimated ? motion.div : 'div';

  return (
    <LayoutContainer
      className="w-full max-w-4xl mx-auto space-y-8 text-right"
      dir="rtl"
      {...(isAnimated ? { variants: containerVariants, initial: 'hidden', animate: 'visible' } : {})}
    >
      {/* Tab-like Navigation for settings */}
      <MotionItem
        className="flex items-center text-[10px] font-black uppercase tracking-widest border-b border-border pb-4"
        {...(isAnimated ? { variants: itemVariants } : {})}
      >
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
      </MotionItem>

      <MotionItem
        className="w-full pt-2"
        {...(isAnimated ? { variants: itemVariants } : {})}
      >
        <Outlet />
      </MotionItem>
    </LayoutContainer>
  );
}
