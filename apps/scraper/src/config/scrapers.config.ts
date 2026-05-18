import { CompanyTypes } from 'israeli-bank-scrapers';

export interface ScraperMetadata {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

export const SCRAPERS_METADATA: Record<string, Omit<ScraperMetadata, 'id'>> = {
  [CompanyTypes.hapoalim]: {
    name: 'בנק הפועלים',
    icon: 'hapoalim',
    enabled: true,
  },
  [CompanyTypes.leumi]: {
    name: 'בנק לאומי',
    icon: 'leumi',
    enabled: false,
  },
  [CompanyTypes.max]: {
    name: 'MAX',
    icon: 'max',
    enabled: true,
  },
};
