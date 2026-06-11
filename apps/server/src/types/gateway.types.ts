import {
  UserPayload,
  UserAiConfig,
  ScanIncomeResult,
  CategorizedExpense,
  ScraperErrorCode,
} from '@money-up/types';

export { UserPayload, UserAiConfig };

export type SpendingScanCategory = CategorizedExpense;
export type SpendingScansResponse = ScanIncomeResult;
export type PublicScraperErrorCode = ScraperErrorCode;

export type SessionTokenPayload = {
  userId: string;
  username: string;
  isAuthenticated: boolean;
  loginTime: string;
};
