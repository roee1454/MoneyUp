import { CompanyTypes } from 'israeli-bank-scrapers';

export interface ScraperMetadata {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  type: 'bank' | 'credit_card';
}

export const SCRAPERS_METADATA: Record<string, Omit<ScraperMetadata, 'id'>> = {
  [CompanyTypes.hapoalim]: {
    name: 'בנק הפועלים',
    icon: 'hapoalim',
    enabled: true,
    type: 'bank',
  },
  [CompanyTypes.leumi]: {
    name: 'בנק לאומי',
    icon: 'leumi',
    enabled: true,
    type: 'bank',
  },
  [CompanyTypes.yahav]: {
    name: 'בנק יהב',
    icon: 'yahav',
    enabled: true,
    type: 'bank',
  },
  [CompanyTypes.max]: {
    name: 'MAX',
    icon: 'max',
    enabled: true,
    type: 'credit_card',
  },
  [CompanyTypes.isracard]: {
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
