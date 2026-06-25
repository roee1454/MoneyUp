import { Injectable } from '@nestjs/common';
import { ScraperService } from '../scraper/scraper.service';
import { SpendingScansResponse } from '../../types/gateway.types';
import { AgentProvider } from '@money-up/common';
import { SpendingAnnotationService } from './spending-annotation.service';

/**
 * Service managing user spending, financial aggregates, and categorization.
 * Coordinates database caching, triggers automated background synchronization jobs,
 * runs scanning routines, and handles AI-based merchant classification passes.
 */
@Injectable()
export class SpendingService {
  private readonly spendingScansDebugEnabled =
    String(
      process.env.MONEYUP_SPENDING_SCANS_DEBUG ??
        process.env.MONEYUP_AI_SCANS_DEBUG ??
        '',
    ).toLowerCase() === 'true';

  constructor(
    private readonly scraperService: ScraperService,
    private readonly spendingAnnotationService: SpendingAnnotationService,
  ) {}

  /**
   * Computes the user's transaction aggregates (income and expenses) for the specified period.
   * If the cache is stale or incomplete, automatically schedules a background scraping sync job.
   *
   * @param userId The ID of the requesting user.
   * @param accountsOverride Optional transaction data arrays to override cached database entries (useful for manual mock overrides).
   * @param period Time boundaries option ('current', 'previous', or 'both').
   * @param debug Enables detailed transaction logs to stdout.
   * @param startDate Custom date range start (YYYY-MM-DD).
   * @param endDate Custom date range end (YYYY-MM-DD).
   * @returns Promise<SpendingScansResponse> Containing category breakdowns, totals, and transaction logs.
   */
  async computeSpendingScans(
    userId: string,
    accountsOverride?: Array<{
      bankId: string;
      accountNumber: string;
      balance?: number;
      transactions: any[];
    }>,
    period: 'current' | 'previous' | 'both' = 'current',
    debug = false,
    startDate?: string,
    endDate?: string,
  ): Promise<SpendingScansResponse> {
    let accounts: any[];

    if (accountsOverride) {
      accounts = accountsOverride;
    } else {
      const response = await this.scraperService.getConnectedAccounts({
        userId,
        startDate,
        endDate,
      });
      accounts = response.accounts;
    }

    if (this.spendingScansDebugEnabled) {
      const accountsSummary = (accounts ?? []).map((account) => ({
        bankId: account?.bankId,
        accountNumber: account?.accountNumber,
        transactionCount: Array.isArray(account?.transactions)
          ? account.transactions.length
          : 0,
      }));
      console.log('[SPENDING_SCANS_DEBUG] raw_accounts', {
        userId,
        period,
        accountsCount: accountsSummary.length,
        accountsSummary,
      });
    }

    const scanResult = await this.scraperService.scanIncome({
      accounts,
      period,
      startDate,
      endDate,
      debug,
    });

    if (this.spendingScansDebugEnabled) {
      console.log('[SPENDING_SCANS_DEBUG] computed_categories', {
        userId,
        period,
        totalIncome: scanResult.totalIncome,
        totalExpenses: scanResult.totalExpenses,
        categories: scanResult.categories.map((category) => ({
          name: category.name,
          amount: category.amount,
          count: category.count,
          transactionCount:
            scanResult.categoryTransactions?.[category.name]?.length ?? 0,
        })),
      });
    }

    return scanResult;
  }

  /**
   * Triggers an active AI processing run to classify uncategorized merchants.
   * Scans existing transactions, extracts unresolved merchant strings, prompts the configured
   * LLM API to suggest standard categories, and writes back findings to the annotation store.
   *
   * @param userId The ID of the target user.
   * @param period Time boundaries option ('current', 'previous', or 'both').
   * @param startDate Optional custom range start date.
   * @param endDate Optional custom range end date.
   * @param overrideProvider Option to force a specific model provider (e.g., 'openai').
   * @param overrideModel Option to force a specific model version.
   * @returns Promise<SpendingScansResponse> Re-computed scans with updated categories.
   */
  async runSpendingAnnotationPass(
    userId: string,
    period: 'current' | 'previous' | 'both',
    startDate?: string,
    endDate?: string,
    overrideProvider?: AgentProvider,
    overrideModel?: string,
    onProgress?: (info: { currentMerchant: string; progressPercent: number }) => void,
  ): Promise<SpendingScansResponse> {
    const response = await this.scraperService.getConnectedAccounts({
      userId,
      startDate,
      endDate,
    });
    const accounts = response.accounts ?? [];
    const initial = await this.scraperService.scanIncome({
      accounts,
      period,
      startDate,
      endDate,
      debug: false,
    });

    const unresolvedMerchants = initial.unresolvedMerchants ?? [];

    if (unresolvedMerchants.length === 0) {
      return initial;
    }
    
    const aiCategoryAnnotations = await this.spendingAnnotationService.classifyUnknownMerchantsWithAi(
      userId,
      unresolvedMerchants,
      overrideProvider,
      overrideModel,
      onProgress,
    );
    
    if (aiCategoryAnnotations.length === 0) {
      return initial;
    }
    
    await this.scraperService.upsertAnnotations({
      annotations: aiCategoryAnnotations,
    });
    
    return this.scraperService.scanIncome({
      accounts,
      period,
      startDate,
      endDate,
      debug: false,
    });
  }

  /**
   * Marks a specific transaction as duplicate or returns it to active status.
   * Delegated directly to ScraperService.
   *
   * @param userId Target user ID.
   * @param bankId Financial institution ID.
   * @param accountNumber Target bank account or credit card number.
   * @param id The transaction unique ID.
   * @param isDuplicate True to mark as duplicate, false to restore.
   */
  async markTransactionDuplicate(
    userId: string,
    bankId: string,
    accountNumber: string,
    id: string,
    isDuplicate: boolean,
  ): Promise<void> {
    console.log(
      `[Gateway] Sending mark_transaction_duplicate for ${id} (duplicate=${isDuplicate})`,
    );
    try {
      await this.scraperService.markTransactionDuplicate({
        userId,
        bankId,
        accountNumber,
        id,
        isDuplicate,
      });
      console.log(`[Gateway] Received success response for ${id}`);
    } catch (err) {
      console.error('[SpendingService] Failed to mark duplicate:', err);
      throw err;
    }
  }
}
