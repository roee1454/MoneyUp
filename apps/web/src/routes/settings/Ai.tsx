import { useState } from 'react';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { AiProvidersSection } from '@/features/settings/components/AiProvidersSection';
import { AddAiProviderDialog } from '@/features/ai/components/AddAiProviderDialog';
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

export default function AiSettings() {
  const session = useAppStore((s) => s.session);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const { data: userProfile, refetch: refetchProfile } = useUserProfile(
    session?.userId,
  );

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
          בינה מלאכותית
        </h2>
        <p className="text-muted-foreground font-medium max-w-2xl">
          הגדר את ספקי ה-AI שישמשו לניתוח ההוצאות שלך, קבלת תובנות ויצירת דוחות
          חכמים.
        </p>
      </MotionItem>

      <MotionItem {...(isAnimated ? { variants: itemVariants } : {})}>
        <AiProvidersSection
          userProfile={userProfile}
          onAddClick={() => setIsAiDialogOpen(true)}
        />
      </MotionItem>

      <AddAiProviderDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        onSuccess={refetchProfile}
      />
    </LayoutContainer>
  );
}
