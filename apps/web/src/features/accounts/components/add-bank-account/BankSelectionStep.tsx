import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PremiumGridButton } from '@/components/ui/premium-grid-button';
import { BankIcon } from '../BankIcon';
import type { BankSelectionStepProps } from './types';

/** Bank / credit-card selection grid with category tabs. */
export function BankSelectionStep({
  scrapers,
  activeTab,
  onTabChange,
  onBankSelect,
  isLoading,
}: BankSelectionStepProps) {
  return (
    <div className="animate-in fade-in-50 duration-200 slide-in-from-bottom-2 space-y-4">
      <DialogHeader className="text-right space-y-1.5 pb-4 border-b border-border">
        <DialogTitle className="text-xl font-black text-foreground">
          חיבור מקור מידע פיננסי
        </DialogTitle>
        <DialogDescription className="text-xs font-semibold text-muted-foreground">
          סנכרן באופן אוטומטי ומאובטח את הנתונים הפיננסיים שלך
        </DialogDescription>
      </DialogHeader>

      {/* Tabs Selector */}
      <div className="flex border-b border-border pt-1">
        <button
          type="button"
          className={`flex-1 pb-3 text-xs font-black transition-all border-b-2 cursor-pointer ${
            activeTab === 'credit_card'
              ? 'border-border text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onTabChange('credit_card')}
        >
          💳 חברות אשראי
        </button>
        <button
          type="button"
          className={`flex-1 pb-3 text-xs font-black transition-all border-b-2 cursor-pointer ${
            activeTab === 'bank'
              ? 'border-border text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onTabChange('bank')}
        >
          🏦 בנקים (חשבון עו״ש)
        </button>
      </div>

      {/* Premium Explanation Banner */}
      <div className="bg-muted/40 border border-border p-3 text-xs leading-relaxed text-muted-foreground rounded-none animate-in fade-in-50 duration-150">
        {activeTab === 'bank' ? (
          <p>
            <span className="font-black text-foreground/80">
              למה לחבר?
            </span>{' '}
            סנכרון יתרת העובר ושב (עו״ש), משכורות, העברות בנקאיות, פקדונות
            וכרטיסי חיוב מיידי (דביט / דירקט).
          </p>
        ) : (
          <p>
            <span className="font-black text-foreground/80">
              למה לחבר?
            </span>{' '}
            סנכרון כל עסקאות האשראי המפורטות (בארץ ובחו״ל), רכישות
            בתשלומים, וזיהוי מדויק של תאריכי וסכומי החיוב החודשיים.
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <span className="text-xs font-semibold text-muted-foreground">
            טוען מוסדות פיננסיים...
          </span>
        </div>
      ) : (
        <div className="grid gap-3 pt-2">
          {scrapers.map((bank) => (
            <PremiumGridButton
              key={bank.id}
              onClick={() => onBankSelect(bank)}
              label={bank.name}
              icon={
                <BankIcon bankId={bank.id} shape="circle" size="sm" />
              }
            />
          ))}
          {scrapers.length === 0 && (
            <p className="text-xs text-center py-8 text-muted-foreground font-semibold">
              לא נמצאו מוסדות פעילים בקטגוריה זו
            </p>
          )}
        </div>
      )}
    </div>
  );
}
