import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { ScraperSettingsSection } from '@/features/settings/components/ScraperSettingsSection';
import { motion, useReducedMotion, type Variants } from 'motion/react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.02,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function ScrapersSettings() {
  const session = useAppStore((s) => s.session);
  const { data: userProfile } = useUserProfile(session?.userId);

  const shouldReduceMotion = useReducedMotion();
  const isAnimated = !shouldReduceMotion;

  const LayoutContainer = isAnimated ? motion.div : 'div';
  const MotionItem = isAnimated ? motion.div : 'div';

  return (
    <LayoutContainer
      className="w-full space-y-10"
      {...(isAnimated ? { variants: containerVariants, initial: 'hidden', animate: 'visible' } : {})}
    >
      <MotionItem className="space-y-2" {...(isAnimated ? { variants: itemVariants } : {})}>
        <h2 className="text-5xl font-black text-foreground tracking-tighter uppercase">
          הגדרות סריקה
        </h2>
        <p className="text-muted-foreground font-medium max-w-2xl">
          קונפיגורציה מתקדמת לסורקים האוטומטיים, ניהול זמני המתנה ואיתור רכיבי
          דפדפן.
        </p>
      </MotionItem>

      <MotionItem {...(isAnimated ? { variants: itemVariants } : {})}>
        <ScraperSettingsSection userProfile={userProfile} />
      </MotionItem>
    </LayoutContainer>
  );
}
