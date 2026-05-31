import {
  UserPayload,
  CategorizedExpense,
  ScanTransaction,
  ScanDebugTrace,
  UserAiConfig,
  ScraperResponse,
} from '@money-up/types';

export { UserPayload, UserAiConfig };

export type SpendingScanCategory = CategorizedExpense;

export type SpendingScansResponse = {
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  categories: SpendingScanCategory[];
  categoryTransactions: Record<string, ScanTransaction[]>;
  unresolvedMerchants?: Array<{
    normalizedMerchant: string;
    displayMerchant: string;
  }>;
  debugTrace?: ScanDebugTrace;
};

export type PublicScraperErrorCode = ScraperResponse['errorCode'];

export type SessionTokenPayload = {
  userId: string;
  username: string;
  isAuthenticated: boolean;
  loginTime: string;
};
