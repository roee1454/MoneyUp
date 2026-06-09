import { useState } from 'react';
import { Warning, Trash, CircleNotch } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  type BankAccount,
  isCreditCompanyBankId,
  useDisconnectAccount,
} from '@/hooks/useAccounts';
import { BankIcon } from './BankIcon';
import { getBankName, normalizeBankId } from '@/lib/bank-branding';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DisconnectConfirmDialog } from './DisconnectConfirmDialog';

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
  accounts.reduce(
    (sum, account) => sum + (account.transactions?.length ?? 0),
    0,
  );

export function AccountStrip({
  accounts,
  onAddClick,
  isInitialLoading = false,
  isRefreshingValues = false,
}: AccountStripProps) {
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
  const disconnectAccount = useDisconnectAccount();
  const queryClient = useQueryClient();

  const handleDisconnect = async () => {
    if (!selectedBankId) return;

    setIsDisconnecting(true);
    try {
      await disconnectAccount.mutateAsync(selectedBankId);
      void queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      setShowConfirmDisconnect(false);
      setSelectedBankId(null);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-16 w-full border border-border bg-card px-5 py-2 rounded-none flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted animate-soft-shimmer" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-20 bg-muted animate-soft-shimmer" />
                <div className="h-2 w-14 bg-muted/50" />
              </div>
            </div>
            <div className="h-3 w-16 bg-muted animate-soft-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="col-span-full border border-dashed border-border bg-muted/20 p-8 flex flex-col items-center justify-center text-center space-y-3">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Warning className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-black text-foreground">
            בוא נחבר את חברת האשראי כדי להתחיל
          </p>
          <p className="text-xs font-medium text-muted-foreground max-w-xs leading-relaxed">
            חיבור לחברת האשראי (Cal, Max או Isracard) יאפשר ל-AI לסווג ולנתח את
            ההוצאות שלך אוטומטית.
          </p>
        </div>
        <Button
          onClick={onAddClick}
          className="h-9 px-6 text-xs font-black bg-primary text-primary-foreground rounded-none mt-2"
        >
          חבר את חברת האשראי
        </Button>
      </div>
    );
  }

  // Group accounts by bankId (connection)
  const groupedConnections = accounts.reduce(
    (acc, account) => {
      const key = account.bankId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(account);
      return acc;
    },
    {} as Record<string, BankAccount[]>,
  );

  const activeConnections = Object.keys(groupedConnections);

  const selectedAccounts = selectedBankId
    ? groupedConnections[selectedBankId] || []
    : [];

  return (
    <div className="flex flex-col gap-2 w-full">
      {activeConnections.map((bankId) => {
        const bankAccounts = groupedConnections[bankId];
        const isCard = isCreditCompanyBankId(bankId);

        // Sum all balances in this connection (bank accounts only)
        const totalBalance = bankAccounts.reduce(
          (sum, acc) => sum + (acc.balance ?? 0),
          0,
        );
        const transactionsCount = getTransactionsCount(bankAccounts);

        const lastScrapedAt = bankAccounts[0]?.lastScrapedAt;
        const lastScrapedText = lastScrapedAt
          ? `סונכרן: ${new Date(lastScrapedAt).toLocaleDateString('he-IL', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}`
          : 'טרם סונכרן';

        return (
          <button
            key={bankId}
            onClick={() => setSelectedBankId(bankId)}
            className="h-16 w-full border border-border bg-card hover:bg-accent px-5 py-2 rounded-none flex items-center justify-between transition-all cursor-pointer text-right group select-none"
          >
            <div className="flex items-center gap-2">
              <BankIcon bankId={bankId} size="sm" />
              <div className="text-right leading-tight">
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  {getBankName(bankId)}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground">
                  {bankAccounts.length === 1
                    ? isCard
                      ? 'כרטיס אחד'
                      : 'חשבון אחד'
                    : `${bankAccounts.length} ${isCard ? 'כרטיסים' : 'חשבונות'}`}
                  {` • ${lastScrapedText}`}
                </p>
              </div>
            </div>
            {isCard ? (
              <div className="text-right leading-tight">
                {isRefreshingValues ? (
                  <div className="h-4 w-12 bg-muted animate-soft-shimmer" />
                ) : (
                  <p className="text-xs md:text-sm font-black text-foreground/80">
                    {transactionsCount.toLocaleString('he-IL')}
                  </p>
                )}
                <p className="text-[9px] font-semibold text-muted-foreground">
                  תנועות
                </p>
              </div>
            ) : (
              <>
                {isRefreshingValues ? (
                  <div className="h-4 w-20 bg-muted animate-soft-shimmer" />
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
        <Dialog
          open={!!selectedBankId}
          onOpenChange={(open) => !open && setSelectedBankId(null)}
        >
          <DialogContent
            className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl"
            dir="rtl"
            showCloseButton={false}
          >
            <DialogHeader className="pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <BankIcon bankId={selectedBankId} size="md" />
                <div className="text-right">
                  <DialogTitle className="text-base font-black text-foreground">
                    {getBankName(selectedBankId)}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-semibold text-muted-foreground">
                    פירוט החשבונות והכרטיסים המחוברים בסנכרון זה
                    {selectedAccounts[0]?.lastScrapedAt && (
                      <>
                        <br />
                        סונכרן לאחרונה: {new Date(selectedAccounts[0].lastScrapedAt).toLocaleString('he-IL')}
                      </>
                    )}
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
                    className="border border-border bg-muted/30 px-4 py-3 flex items-center justify-between rounded-none animate-in fade-in-50 duration-150"
                  >
                    <div className="text-right">
                      <p className="text-xs font-bold text-foreground">
                        {isCard ? 'כרטיס אשראי' : 'חשבון עו״ש'}
                      </p>
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        מספר: {getAccountId(account)}
                      </p>
                    </div>
                    {isCard ? (
                      <div className="text-left">
                        <p className="text-sm font-black text-foreground/80">
                          {transactionCount.toLocaleString('he-IL')}
                        </p>
                        <p className="text-[9px] font-semibold text-muted-foreground mt-0.5">
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

            <DialogFooter className="pt-4 border-t border-border flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full h-10 border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/40 font-bold transition-all flex items-center justify-center gap-2"
                onClick={() => setShowConfirmDisconnect(true)}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <CircleNotch className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash className="h-4 w-4" />
                )}
                <span>נתק חיבור זה ומחק נתונים</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Disconnect Dialog */}
      <DisconnectConfirmDialog
        open={showConfirmDisconnect}
        onOpenChange={setShowConfirmDisconnect}
        bankId={selectedBankId}
        isDisconnecting={isDisconnecting}
        onConfirm={handleDisconnect}
      />
    </div>
  );
}
