import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type BankAccount } from '@/hooks/useAccounts';
import { BankIcon } from '@/components/BankIcon';
import { getBankName, normalizeBankId } from '@/lib/bank-branding';

interface AccountStripProps {
  accounts: BankAccount[];
  onAddClick: () => void;
}

const getAccountId = (account: BankAccount) => {
  if (normalizeBankId(account.bankId) === 'max') {
    return account.accountNumber.slice(-4);
  }
  return account.accountNumber;
};

const formatBalance = (value: number) => {
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'ILS',
      notation: 'compact',
      maximumFractionDigits: 2,
    });
  }

  return value.toLocaleString('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  });
};

export function AccountStrip({ accounts, onAddClick }: AccountStripProps) {
  if (accounts.length === 0) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 p-6 rounded-none space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">בוא נחבר את חשבון הבנק הראשון שלך</h2>
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            הוסף חשבון כדי להתחיל לראות נתונים ותובנות.
          </p>
        </div>
        <Button
          onClick={onAddClick}
          className="h-11 rounded-none px-6 font-bold text-xs bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
        >
          הוספת חשבון בנק ראשון
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
      {accounts.map((account) => {
        const balance = account.balance ?? 0;

        return (
          <div
            key={`${account.bankId}-${account.accountNumber}`}
            className="h-16 min-w-[210px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 rounded-none flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <BankIcon bankId={account.bankId} size="sm" />
              <div className="text-right leading-tight">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{getBankName(account.bankId)}</p>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">מס׳ {getAccountId(account)}</p>
              </div>
            </div>
            <div
              className={`max-w-[95px] text-right text-xs md:text-sm font-black leading-tight truncate ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
              title={balance.toLocaleString('he-IL', { style: 'currency', currency: 'ILS' })}
            >
              {formatBalance(balance)}
            </div>
          </div>
        );
      })}

      <button
        onClick={onAddClick}
        className="h-16 min-w-[64px] border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
        aria-label="הוסף חשבון"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
