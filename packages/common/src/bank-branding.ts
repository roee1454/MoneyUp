export type BankIconShape = 'circle' | 'rounded-square';

export interface ScraperMetadata {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  type: 'bank' | 'credit_card';
}

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
    case 'yahav':
      return 'בנק יהב';
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
  yahav: '/banks/yahav.png',
};

export const BANK_ICON_SHAPE_BY_ID: Record<string, BankIconShape> = {
  max: 'rounded-square',
  cal: 'rounded-square',
  hapoalim: 'rounded-square',
  yahav: 'rounded-square',
};

export const SCRAPERS_METADATA: Record<string, Omit<ScraperMetadata, 'id'>> = {
  hapoalim: {
    name: 'בנק הפועלים',
    icon: 'hapoalim',
    enabled: true,
    type: 'bank',
  },
  leumi: {
    name: 'בנק לאומי',
    icon: 'leumi',
    enabled: true,
    type: 'bank',
  },
  yahav: {
    name: 'בנק יהב',
    icon: 'yahav',
    enabled: true,
    type: 'bank',
  },
  max: {
    name: 'MAX',
    icon: 'max',
    enabled: true,
    type: 'credit_card',
  },
  isracard: {
    name: 'ישראכרט',
    icon: 'isracard',
    enabled: true,
    type: 'credit_card',
  },
  cal: {
    name: 'CAL',
    icon: 'cal',
    enabled: true,
    type: 'credit_card',
  },
};
