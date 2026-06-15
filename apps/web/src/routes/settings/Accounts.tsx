import { useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useAppStore } from '@/store';
import { BankConnectionsSection } from '@/features/settings/components/BankConnectionsSection';
import { AddBankAccountDialog } from '@/features/accounts/components/AddBankAccountDialog';
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

export default function AccountsSettings() {
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const syncState = useAppStore((s) => s.sync);
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts();

  const isSyncing =
    syncState.status === 'running' || syncState.status === 'reconnecting';

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
          חשבונות ואשראי
        </h2>
        <p className="text-muted-foreground font-medium max-w-2xl">
          נהל את החיבורים שלך למוסדות הפיננסיים וכרטיסי האשראי לסנכרון אוטומטי
          של הנתונים.
        </p>
      </MotionItem>

      <MotionItem {...(isAnimated ? { variants: itemVariants } : {})}>
        <BankConnectionsSection
          accounts={accounts}
          isLoadingAccounts={isLoadingAccounts}
          isSyncing={isSyncing}
          onAddClick={() => setIsBankDialogOpen(true)}
        />
      </MotionItem>

      <AddBankAccountDialog
        open={isBankDialogOpen}
        onOpenChange={setIsBankDialogOpen}
        onSuccess={() => {}}
      />
    </LayoutContainer>
  );
}
