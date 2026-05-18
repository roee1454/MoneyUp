import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type BankAccount } from '@/hooks/useAccounts';
import { BankIcon } from '@/components/BankIcon';
import { getBankName, normalizeBankId } from '@/lib/bank-branding';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AccountStripProps {
  accounts: BankAccount[];
  onAddClick: () => void;
}

const getAccountId = (account: BankAccount) => {
  const normalizedBankId = normalizeBankId(account.bankId);

  if (normalizedBankId === 'max') {
    return account.accountNumber.slice(-4);
  }

  if (normalizedBankId === 'hapoalim') {
    const parts = account.accountNumber.split('-');
    if (parts.length >= 3) {
      return parts.slice(2).join('-');
    }
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

const isCreditCardCompany = (bankId: string) => {
  const norm = bankId.toLowerCase();
  return norm === 'max' || norm === 'isracard';
};

export function AccountStrip({ accounts, onAddClick }: AccountStripProps) {
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  if (accounts.length === 0) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-zinc-300 dark:border-zinc-800/80 p-6 rounded-none space-y-4">
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

  // Group accounts by bankId (connection)
  const groupedConnections = accounts.reduce((acc, account) => {
    const key = account.bankId;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(account);
    return acc;
  }, {} as Record<string, BankAccount[]>);

  const activeConnections = Object.keys(groupedConnections);

  const selectedAccounts = selectedBankId ? groupedConnections[selectedBankId] || [] : [];

  return (
    <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
      {activeConnections.map((bankId) => {
        const bankAccounts = groupedConnections[bankId];
        const isCard = isCreditCardCompany(bankId);
        
        // Sum all balances in this connection
        const totalBalance = bankAccounts.reduce((sum, acc) => sum + (acc.balance ?? 0), 0);

        return (
          <button
            key={bankId}
            onClick={() => setSelectedBankId(bankId)}
            className="h-16 min-w-[230px] border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50/80 dark:bg-zinc-950 dark:hover:bg-zinc-900/60 px-3 py-2 rounded-none flex items-center justify-between transition-all cursor-pointer text-right group select-none"
          >
            <div className="flex items-center gap-2">
              <BankIcon bankId={bankId} size="sm" />
              <div className="text-right leading-tight">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                  {getBankName(bankId)}
                </p>
                <p className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-500">
                  {bankAccounts.length === 1 
                    ? (isCard ? 'כרטיס אחד' : 'חשבון אחד') 
                    : `${bankAccounts.length} ${isCard ? 'כרטיסים' : 'חשבונות'}`}
                </p>
              </div>
            </div>
            <div
              className={`text-right text-xs md:text-sm font-black leading-tight ${
                totalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatBalance(totalBalance)}
            </div>
          </button>
        );
      })}

      <button
        onClick={onAddClick}
        className="h-16 min-w-[64px] border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer rounded-none"
        aria-label="הוסף חשבון"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Connection Accounts Dialog */}
      {selectedBankId && (
        <Dialog open={!!selectedBankId} onOpenChange={(open) => !open && setSelectedBankId(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none p-6" dir="rtl" showCloseButton={false}>
            <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-3">
                <BankIcon bankId={selectedBankId} size="md" />
                <div className="text-right">
                  <DialogTitle className="text-base font-black text-zinc-950 dark:text-white">
                    {getBankName(selectedBankId)}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    פירוט החשבונות והכרטיסים המחוברים בסנכרון זה
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-4 space-y-2 max-h-80 overflow-y-auto pr-1">
              {selectedAccounts.map((account) => {
                const balance = account.balance ?? 0;
                const isCard = isCreditCardCompany(account.bankId);

                return (
                  <div
                    key={account.accountNumber}
                    className="border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 px-4 py-3 flex items-center justify-between rounded-none animate-in fade-in-50 duration-150"
                  >
                    <div className="text-right">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {isCard ? 'כרטיס אשראי' : 'חשבון עו״ש'}
                      </p>
                      <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                        מספר: {getAccountId(account)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-black ${
                        balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatBalance(balance)}
                    </p>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
