export type BankIconShape = 'circle' | 'rounded-square';

export function normalizeBankId(bankId: string): string {
  const normalized = bankId.toLowerCase();
  if (normalized === 'one_zero' || normalized === 'one-zero') return 'onezero';
  return normalized;
}

export function getBankName(bankId: string): string {
  switch (normalizeBankId(bankId)) {
    case 'hapoalim':
      return 'בנק הפועלים';
    case 'max':
      return 'MAX';
    case 'isracard':
      return 'ישראכרט';
    case 'leumi':
      return 'לאומי';
    case 'pepper':
      return 'PEPPER';
    case 'onezero':
      return 'ONE ZERO';
    default:
      return bankId;
  }
}

export const BANK_ICON_BY_ID: Record<string, string> = {
  hapoalim: '/banks/hapoalim.png',
  max: '/banks/max.png',
  isracard: '/banks/isracard.png',
  leumi: '/banks/leumi.png',
  pepper: '/banks/pepper.png',
  onezero: '/banks/onezero.png',
};

export const BANK_ICON_SHAPE_BY_ID: Record<string, BankIconShape> = {
  max: 'rounded-square',
  hapoalim: 'rounded-square',
};
