import { Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { BankIcon } from '../BankIcon';
import { Confetti } from '../Confetti';
import type { ConnectedViewProps } from './types';

/** Success celebration view shown after a bank account is connected. */
export function ConnectedView({ bankId, bankName, onClose }: ConnectedViewProps) {
  const navigate = useNavigate();

  const handleStart = () => {
    onClose();
    void navigate({ to: '/dashboard' });
  };

  return (
    <>
      <Confetti />

      <div className="animate-in fade-in-50 duration-500 zoom-in-95 min-h-[340px] flex flex-col items-center justify-center text-center gap-6">
        {/* Standalone success check */}
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500 animate-in zoom-in-50 duration-300 [animation-delay:150ms]">
          <Check className="h-7 w-7 text-white" weight="bold" />
        </div>

        <div className="flex items-center justify-center">
          <BankIcon
            bankId={bankId}
            shape="circle"
            size="xl"
            className="shadow-xl"
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black text-foreground tracking-tight">החיבור הושלם בהצלחה!</h3>
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed max-w-xs">
            חשבון <span className="font-bold text-foreground">{bankName}</span> סונכרן וחובר בהצלחה. כל העסקאות האחרונות כבר זמינות לניתוח במערכת.
          </p>
        </div>

        <Button
          onClick={handleStart}
          className="rounded-none font-black text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-10 transition-all active:scale-95 shadow-lg shadow-primary/15 mt-2 animate-in fade-in duration-300 [animation-delay:400ms]"
        >
          בוא נתחיל
        </Button>
      </div>
    </>
  );
}
