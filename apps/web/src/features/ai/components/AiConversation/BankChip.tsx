import { useState } from 'react';
import { BankIcon } from '@/features/accounts/components/BankIcon';
import { getBankName } from '@money-up/common';
import { cn } from '@/lib/utils';
import { Check, Copy } from '@phosphor-icons/react';

interface BankChipProps {
  bankId: string;
  accountIdentifier?: string;
  className?: string;
}

export function BankChip({ bankId, accountIdentifier, className }: BankChipProps) {
  const [copied, setCopied] = useState(false);

  const bankName = getBankName(bankId);
  const displayName = accountIdentifier ? `${bankName} • ${accountIdentifier}` : bankName;
  const copyText = accountIdentifier || bankId;

  function handleCopy() {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={handleCopy}
      title={accountIdentifier ? `העתק פרטי חשבון: ${accountIdentifier}` : `העתק: ${bankId}`}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full',
        'border border-border bg-muted/40 hover:bg-muted/70',
        'text-xs font-semibold text-foreground',
        'transition-all duration-150 cursor-pointer select-none align-middle',
        'active:scale-95',
        className,
      )}
    >
      <BankIcon bankId={bankId} size="sm" className="!h-4 !w-4" />
      <span>{displayName}</span>
      <span className="text-muted-foreground/60 transition-opacity">
        {copied ? (
          <Check className="h-3 w-3 text-green-500" weight="bold" />
        ) : (
          <Copy className="h-3 w-3" weight="bold" />
        )}
      </span>
    </button>
  );
}
