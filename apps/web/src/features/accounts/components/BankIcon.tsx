import { useState } from 'react';
import {
  BANK_ICON_BY_ID,
  BANK_ICON_SHAPE_BY_ID,
  type BankIconShape,
  getBankName,
  normalizeBankId,
} from '@/lib/bank-branding';
import { cn } from '@/lib/utils';

interface BankIconProps {
  bankId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: BankIconShape;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const sizeClassByVariant: Record<NonNullable<BankIconProps['size']>, string> = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-20 w-20 text-xl',
};

export function BankIcon({
  bankId,
  size = 'md',
  shape,
  fill,
  className = '',
  style,
}: BankIconProps) {
  const [failed, setFailed] = useState(false);
  const normalizedBankId = normalizeBankId(bankId);
  const src = BANK_ICON_BY_ID[normalizedBankId];
  const resolvedShape =
    shape ?? BANK_ICON_SHAPE_BY_ID[normalizedBankId] ?? 'circle';
  const shouldFill = fill ?? normalizedBankId === 'max';
  const shapeClass =
    resolvedShape === 'rounded-square' ? 'rounded-md' : 'rounded-full';
  const label = getBankName(bankId);
  const fallback = label.slice(0, 1);

  if (!src || failed) {
    return (
      <div
        style={style}
        className={`${sizeClassByVariant[size]} ${shapeClass} border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center font-black text-zinc-600 dark:text-zinc-300 ${className}`}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      style={style}
      className={cn(`${sizeClassByVariant[size]} ${shapeClass} border border-zinc-200 dark:border-zinc-200 bg-white overflow-hidden`, className)}
    >
      <img
        src={src}
        alt={label}
        className={`h-full w-full ${shouldFill ? 'object-cover' : 'object-contain'}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
