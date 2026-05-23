export type BankIconShape = 'circle' | 'rounded-square';

export function normalizeBankId(bankId: string | null | undefined): string {
  const normalized = String(bankId ?? '').toLowerCase();
  if (normalized === 'one_zero' || normalized === 'one-zero') return 'onezero';
  return normalized;
}

export function getBankName(bankId: string | null | undefined): string {
  switch (normalizeBankId(bankId)) {
    case 'hapoalim':
      return 'בנק הפועלים';
    case 'max':
      return 'MAX';
    case 'isracard':
      return 'ישראכרט';
    case 'cal':
      return 'CAL';
    case 'leumi':
      return 'לאומי';
    case 'pepper':
      return 'PEPPER';
    case 'onezero':
      return 'ONE ZERO';
    default:
      return String(bankId ?? 'Unknown');
  }
}

export const BANK_ICON_BY_ID: Record<string, string> = {
  hapoalim: '/banks/hapoalim.png',
  max: '/banks/max.png',
  isracard: '/banks/isracard.png',
  cal: '/banks/cal.png',
  leumi: '/banks/leumi.png',
  pepper: '/banks/pepper.png',
  onezero: '/banks/onezero.png',
};

export const BANK_ICON_SHAPE_BY_ID: Record<string, BankIconShape> = {
  max: 'rounded-square',
  cal: 'rounded-square',
  hapoalim: 'rounded-square',
};
