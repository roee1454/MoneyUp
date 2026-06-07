export interface SpendingTransactionItem {
  id?: string;
  merchant: string;
  date: string;
  rawDate: string;
  amount: number;
  originalCategory?: string;
  confidence?: number;
  reason?: string;
  tags?: string[];
  cardKey?: string;
  cardLabel?: string;
}

export interface SpendingCategoryItem {
  name: string;
  emoji: string;
  amount: number;
  transactions: SpendingTransactionItem[];
  count?: number;
  totalCount?: number;
  excludedCount?: number;
}
