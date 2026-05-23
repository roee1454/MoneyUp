import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { type BankAccount, isCreditCompanyBankId } from '@/hooks/useAccounts';
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
  isInitialLoading?: boolean;
  isRefreshingValues?: boolean;
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

const getTransactionsCount = (accounts: BankAccount[]) =>
  accounts.reduce((sum, account) => sum + (account.transactions?.length ?? 0), 0);

export function AccountStrip({
  accounts,
  onAddClick,
  isInitialLoading = false,
  isRefreshingValues = false,
}: AccountStripProps) {
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  if (isInitialLoading) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-16 w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 rounded-none flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-20 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                <div className="h-2 w-14 bg-zinc-100 dark:bg-zinc-900" />
              </div>
            </div>
            <div className="h-3 w-16 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-zinc-300 dark:border-zinc-800/80 p-6 rounded-none space-y-4 text-right">
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">בוא נחבר את חברת האשראי כדי להתחיל</h2>
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed">
            חיבור לחברת האשראי (Cal, Max או Isracard) יאפשר ל-AI לסווג ולנתח את ההוצאות שלך אוטומטית. 
            <span className="block mt-1.5 text-xs text-zinc-450 dark:text-zinc-500">
              לאחר מכן, מומלץ לחבר גם חשבון בנק לצורך מעקב מלא אחר יתרת העו״ש, משכורות והפקדות.
            </span>
          </p>
        </div>
        <Button
          onClick={onAddClick}
          className="h-11 rounded-none px-6 font-bold text-xs bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 cursor-pointer"
        >
          חבר את חברת האשראי
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
    <div className="flex flex-col gap-2 w-full">
      {activeConnections.map((bankId) => {
        const bankAccounts = groupedConnections[bankId];
        const isCard = isCreditCompanyBankId(bankId);

        // Sum all balances in this connection (bank accounts only)
        const totalBalance = bankAccounts.reduce((sum, acc) => sum + (acc.balance ?? 0), 0);
        const transactionsCount = getTransactionsCount(bankAccounts);

        return (
          <button
            key={bankId}
            onClick={() => setSelectedBankId(bankId)}
            className="h-16 w-full border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50/80 dark:bg-zinc-950 dark:hover:bg-zinc-900/60 px-3 py-2 rounded-none flex items-center justify-between transition-all cursor-pointer text-right group select-none"
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
            {isCard ? (
              <div className="text-right leading-tight">
                {isRefreshingValues ? (
                  <div className="h-4 w-12 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                ) : (
                  <p className="text-xs md:text-sm font-black text-zinc-700 dark:text-zinc-200">
                    {transactionsCount.toLocaleString('he-IL')}
                  </p>
                )}
                <p className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-500">תנועות</p>
              </div>
            ) : (
              <>
                {isRefreshingValues ? (
                  <div className="h-4 w-20 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                ) : (
                  <div
                    className={`text-right text-xs md:text-sm font-black leading-tight ${
                      totalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatBalance(totalBalance)}
                  </div>
                )}
              </>
            )}
          </button>
        );
      })}

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
                const isCard = isCreditCompanyBankId(account.bankId);
                const transactionCount = account.transactions?.length ?? 0;

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
                    {isCard ? (
                      <div className="text-left">
                        <p className="text-sm font-black text-zinc-700 dark:text-zinc-200">
                          {transactionCount.toLocaleString('he-IL')}
                        </p>
                        <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
                          תנועות
                        </p>
                      </div>
                    ) : (
                      <p
                        className={`text-sm font-black ${
                          balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatBalance(balance)}
                      </p>
                    )}
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
