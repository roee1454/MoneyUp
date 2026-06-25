import { ScanAccount, UnifiedTransaction } from '@money-up/types';

/**
 * Checks if a bank/institution ID belongs to a credit card company.
 *
 * @param bankId The ID of the institution.
 * @returns boolean
 */
export function isCreditCompany(bankId: string): boolean {
  const normalized = String(bankId ?? '').toLowerCase();
  return (
    normalized === 'max' || normalized === 'isracard' || normalized === 'cal'
  );
}

/**
 * Returns a cleaned description or memo if the description is generic.
 *
 * @param description Transaction description
 * @param memo Transaction memo
 * @returns Clean description string or null
 */
export function getCleanDescription(
  description: string,
  memo?: string,
): string | null {
  const desc = String(description ?? '');
  const mem = String(memo ?? '');
  const cleaned = desc.trim() || mem.trim();
  return cleaned || null;
}

/**
 * Normalizes a merchant name into a standard database query key.
 *
 * @param value Raw merchant name
 * @returns Normalized string
 */
export function normalizeMerchantKey(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a deduplication key for a transaction.
 *
 * @param account The containing scan account
 * @param txn The transaction object
 * @returns Deduplication key string
 */
export function buildTransactionDedupKey(
  account: ScanAccount,
  txn: UnifiedTransaction,
): string {
  const bankId = String(account.bankId ?? '').toLowerCase();
  const accountNumber = String(account.accountNumber ?? '');
  const txnId = String(txn.id ?? '').trim();
  if (txnId) return `id:${bankId}:${accountNumber}:${txnId}`;
  const desc =
    getCleanDescription(txn.description, txn.memo) ??
    String(txn.description ?? '').trim() ??
    String(txn.memo ?? '').trim();
  return `fp:${bankId}:${accountNumber}:${String(txn.date ?? '')}:${String(txn.chargedAmount ?? '')}:${desc.toLowerCase()}`;
}

/**
 * Extracts the last 4 digits of a card/account number.
 *
 * @param value Full account/card number
 * @returns Last 4 digits or undefined
 */
export function extractLast4Digits(value: string): string | undefined {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length < 4) return undefined;
  return digits.slice(-4);
}
