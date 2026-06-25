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
      className="w-full space-y-1 pb-20"
      {...(isAnimated ? { variants: containerVariants, initial: 'hidden', animate: 'visible' } : {})}
    >
      <MotionItem className="space-y-2" {...(isAnimated ? { variants: itemVariants } : {})}>
        <h2 className="text-5xl font-black text-foreground tracking-tighter uppercase">
          הגדרות סריקה
        </h2>
        <p className="text-muted-foreground font-medium max-w-2xl text-sm">
          קונפיגורציה מתקדמת לסורקים האוטומטיים, ניהול זמני המתנה ואיתור רכיבי
          דפדפן.
        </p>
      </MotionItem>

      <MotionItem className='border-b border-border/30 pb-6'>
        {/* Help info dashed warning box */}
        <div className="border border-dashed border-border bg-muted/15 p-5 text-right flex gap-4 items-start rounded-none mt-6 max-w-3xl" {...(isAnimated ? { variants: containerVariants } : {})}>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-foreground leading-tight">
              צריך עזרה?
            </h4>
            <p className="text-[11px] font-semibold text-muted-foreground leading-relaxed">
              הגדרות אלו משפיעות ישירות על יציבות הסנכרון מול הבנקים. במקרה של
              תקלות חוזרות, מומלץ להעלות את זמני ה-Timeout או להפעיל את תצוגת
              הדפדפן כדי לאבחן את הבעיה.
            </p>
          </div>
        </div>
      </MotionItem>
      
      <MotionItem {...(isAnimated ? { variants: itemVariants } : {})}>
        <ScraperSettingsSection userProfile={userProfile} />
      </MotionItem>
    </LayoutContainer>
  );
}
