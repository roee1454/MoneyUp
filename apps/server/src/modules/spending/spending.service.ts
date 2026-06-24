import { Injectable } from '@nestjs/common';
import { ScraperService } from '../scraper/scraper.service';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { SpendingScansResponse, UserAiConfig } from '../../types/gateway.types';
import { SyncJobService } from '../sync/sync-job.service';
import { MERCHANT_CATEGORIZATION_RULES, AgentProvider } from '@money-up/common';

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

  private readonly aiCategoryBatchSize = Math.max(
    1,
    Number(process.env.MONEYUP_AI_CATEGORY_BATCH_SIZE ?? 50),
  );

  constructor(
    private readonly aiService: AiService,
    private readonly scraperService: ScraperService,
    private readonly usersService: UsersService,
    private readonly syncJobService: SyncJobService,
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
    const aiCategoryAnnotations = await this.classifyUnknownMerchantsWithAi(
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

  /**
   * Calls the configured AI Provider to classify an array of unknown merchants.
   * Splits merchants into configured batch sizes and updates them sequentially.
   *
   * @param userId Target user ID.
   * @param unresolved Array containing merchant descriptions and normalized strings.
   * @param overrideProvider Option to override LLM provider.
   * @param overrideModel Option to override LLM model.
   * @returns Array of AI-derived merchant annotations.
   */
  public async classifyUnknownMerchantsWithAi(
    userId: string,
    unresolved: Array<{ normalizedMerchant: string; displayMerchant: string }>,
    overrideProvider?: AgentProvider,
    overrideModel?: string,
    onProgress?: (info: { currentMerchant: string; progressPercent: number }) => void,
  ): Promise<
    Array<{
      normalizedMerchant: string;
      displayMerchant: string;
      category: string;
      source: 'ai';
      model?: string;
      confidence?: number;
    }>
  > {
    const cfg = await this.resolveUserAiConfig(userId);
    const activeProvider = overrideProvider || cfg.activeAiProvider || cfg.configuredProviders?.[0];
    let apiKey = activeProvider
      ? (cfg.decryptedApiKeys?.[activeProvider] || (cfg.activeAiProvider === activeProvider ? cfg.decryptedApiKey : null))
      : null;
    let model = overrideModel || (activeProvider ? cfg.aiProviderConfigs?.[activeProvider]?.model : null) || cfg.preferredModel;

    if (apiKey === '***') {
      apiKey = null;
    }

    if (!activeProvider || !apiKey) {
      return [];
    }

    // Fallback models if preferredModel/overrideModel is not set
    if (!model) {
      if (activeProvider === 'openai') model = 'gpt-4o-mini';
      else if (activeProvider === 'claude') model = 'claude-3-5-haiku-20241022';
      else if (activeProvider === 'gemini') model = 'gemini-2.5-flash';
    }

    if (!model) return [];

    const uniqueMap = new Map<string, string>();
    for (const item of unresolved) {
      const key = String(item.normalizedMerchant ?? '').trim();
      if (!key || uniqueMap.has(key)) continue;
      uniqueMap.set(key, item.displayMerchant || key);
    }
    const uniqueUnknowns = Array.from(uniqueMap.entries()).map(
      ([normalizedMerchant, displayMerchant]) => ({
        normalizedMerchant,
        displayMerchant,
      }),
    );
    const results: Array<{
      normalizedMerchant: string;
      displayMerchant: string;
      category: string;
      keywords: string;
      source: 'ai';
      model?: string;
      confidence?: number;
    }> = [];

    for (let i = 0; i < uniqueUnknowns.length; i += this.aiCategoryBatchSize) {
      const chunk = uniqueUnknowns.slice(i, i + this.aiCategoryBatchSize);
      
      if (onProgress) {
        const percent = Math.min(100, Math.round((i / uniqueUnknowns.length) * 100));
        const currentMerchant = chunk[0]?.displayMerchant || '';
        onProgress({ currentMerchant, progressPercent: percent });
      }

      const prompt = this.buildMerchantCategorizationPrompt(chunk);

      if (this.spendingScansDebugEnabled) {
        console.log(
          `[AI_ANNOTATION] Sending batch of ${chunk.length} merchants to AI`,
        );
      }

      const response = (await this.aiService.getProvider(activeProvider, apiKey).prompt(model, [{ role: 'user', content: prompt }], {
        stream: false,
        temperature: 0,
        maxTokens: 2048,
      })) as any;

      const rawText = response?.type === 'text' ? response.content : (response?.content ?? '');
      if (this.spendingScansDebugEnabled) {
        console.log('[AI_ANNOTATION] Raw AI Response:', rawText);
      }

      const parsed = this.parseCategoryAiResponse(rawText);
      for (const item of chunk) {
        const match = parsed.get(item.normalizedMerchant);
        const normalizedCategory = this.normalizeCategory(match?.category);

        // Only add to results if AI actually found a classification that isn't 'Uncategorized'
        // This prevents permanently locking a merchant into 'Uncategorized' in the DB.
        if (normalizedCategory !== 'לא מסווג') {
          results.push({
            normalizedMerchant: item.normalizedMerchant,
            displayMerchant: item.displayMerchant,
            category: normalizedCategory,
            keywords: match?.keywords,
            source: 'ai',
            model,
            confidence: match?.confidence,
          });
        }
      }
    }
    if (onProgress && uniqueUnknowns.length > 0) {
      onProgress({ currentMerchant: '', progressPercent: 100 });
    }
    return results;
  }

  private buildMerchantCategorizationPrompt(
    items: Array<{ normalizedMerchant: string; displayMerchant: string }>,
  ): string {
    return [
      MERCHANT_CATEGORIZATION_RULES,
      '',
      'Merchants to classify:',
      JSON.stringify(items),
    ].join('\n');
  }

  private parseCategoryAiResponse(
    raw: string,
  ): Map<string, { category: string; keywords?: string; confidence?: number }> {
    const direct =
      this.tryParseJsonArray(raw) ??
      this.tryParseJsonArray(this.extractJsonBlock(raw));
    const map = new Map<
      string,
      { category: string; keywords?: string; confidence?: number }
    >();
    for (const entry of direct ?? []) {
      if (!entry || typeof entry !== 'object') continue;
      const normalizedMerchant = String(
        (entry as any).normalizedMerchant ?? '',
      ).trim();
      if (!normalizedMerchant) continue;
      const category = String((entry as any).category ?? '').trim();
      const keywords = String((entry as any).keywords ?? '').trim();
      const confidenceRaw = Number((entry as any).confidence);
      map.set(normalizedMerchant, {
        category,
        keywords: keywords || undefined,
        confidence: Number.isFinite(confidenceRaw) ? confidenceRaw : undefined,
      });
    }
    return map;
  }

  private tryParseJsonArray(
    value: string,
  ): Array<Record<string, unknown>> | null {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? (parsed as Array<Record<string, unknown>>)
        : null;
    } catch {
      return null;
    }
  }

  private extractJsonBlock(value: string): string {
    const start = value.indexOf('[');
    const end = value.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return '';
    return value.slice(start, end + 1);
  }

  private normalizeCategory(category: string | undefined): string {
    if (!category) return 'לא מסווג';
    const trimmed = category.trim().toLowerCase();

    // Map common English and Hebrew category names to standard Hebrew keys
    const categoryMap: Record<string, string> = {
      // דיור
      'דיור': 'דיור',
      'שכירות': 'דיור',
      'ארנונה': 'דיור',
      'ועד בית': 'דיור',
      'משכנתא': 'דיור',
      'housing': 'דיור',
      'rent': 'דיור',

      // מזון
      'מזון': 'מזון',
      'סופרמרקט': 'מזון',
      'קניות בסופר': 'מזון',
      'סופר': 'מזון',
      'מכולת': 'מזון',
      'מרקט': 'מזון',
      'שופרסל': 'מזון',
      'רמי לוי': 'מזון',
      'ויקטורי': 'מזון',
      'food': 'מזון',
      'groceries': 'מזון',
      'grocery': 'מזון',
      'supermarket': 'מזון',

      // תחבורה
      'תחבורה': 'תחבורה',
      'דלק/תחבורה': 'תחבורה',
      'דלק': 'תחבורה',
      'רב-קו': 'תחבורה',
      'רב קו': 'תחבורה',
      'gett': 'תחבורה',
      'מונית': 'תחבורה',
      'רכבת': 'תחבורה',
      'אוטובוס': 'תחבורה',
      'transport': 'תחבורה',
      'transportation': 'תחבורה',
      'gas': 'תחבורה',
      'fuel': 'תחבורה',
      'parking': 'תחבורה',
      'פז': 'תחבורה',
      'סונול': 'תחבורה',
      'דור אלון': 'תחבורה',
      'פנגו': 'תחבורה',
      'pango': 'תחבורה',

      // שירותים
      'שירותים': 'שירותים',
      'חשמל': 'שירותים',
      'חברת חשמל': 'שירותים',
      'מקורות': 'שירותים',
      'מים': 'שירותים',
      'בזק': 'שירותים',
      'סלולר': 'שירותים',
      'אינטרנט': 'שירותים',
      'גז': 'שירותים',
      'מנוי': 'שירותים',
      'מנויים': 'שירותים',
      'services': 'שירותים',
      'utilities': 'שירותים',

      // בריאות
      'בריאות': 'בריאות',
      'קופת חולים': 'בריאות',
      'בית מרקחת': 'בריאות',
      'כללית': 'בריאות',
      'מכבי': 'בריאות',
      'מאוחדת': 'בריאות',
      'לאומית': 'בריאות',
      'סופר פארם': 'בריאות',
      'סופר-פארם': 'בריאות',
      'מרפאה': 'בריאות',
      'רופא': 'בריאות',
      'פארם': 'בריאות',
      'תרופה': 'בריאות',
      'health': 'בריאות',
      'pharmacy': 'בריאות',

      // חינוך
      'חינוך': 'חינוך',
      'גן': 'חינוך',
      'בית ספר': 'חינוך',
      'קורס': 'חינוך',
      'קורסים': 'חינוך',
      'אוניברסיטה': 'חינוך',
      'מכללה': 'חינוך',
      'חוג': 'חינוך',
      'שיעור': 'חינוך',
      'שכר לימוד': 'חינוך',
      'education': 'חינוך',

      // בילוי
      'בילוי': 'בילוי',
      'בילויים': 'בילוי',
      'בילויים ופנאי': 'בילוי',
      'מותרות': 'בילוי',
      'מסעדה': 'בילוי',
      'מסעדות': 'בילוי',
      'קפה': 'בילוי',
      'בר ': 'בילוי',
      'פאב': 'בילוי',
      'קולנוע': 'בילוי',
      'סרט': 'בילוי',
      'הופעה': 'בילוי',
      'מסיבה': 'בילוי',
      'נטפליקס': 'בילוי',
      'netflix': 'בילוי',
      'ספוטיפיי': 'בילוי',
      'spotify': 'בילוי',
      'וולט': 'בילוי',
      'wolt': 'בילוי',
      'תן ביס': 'בילוי',
      'ten bis': 'בילוי',
      'leisure': 'בילוי',
      'entertainment': 'בילוי',
      'dining': 'בילוי',
      'restaurant': 'בילוי',
      'streaming': 'בילוי',

      // ביטוח
      'ביטוח': 'ביטוח',
      'ביטוחים': 'ביטוח',
      'הראל': 'ביטוח',
      'מגדל': 'ביטוח',
      'פניקס': 'ביטוח',
      'מנורה': 'ביטוח',
      'כלל': 'ביטוח',
      'איילון': 'ביטוח',
      'ישיר': 'ביטוח',
      'insurance': 'ביטוח',

      // חיסכון
      'חיסכון': 'חיסכון',
      'פנסיה': 'חיסכון',
      'קרן השתלמות': 'חיסכון',
      'קופת גמל': 'חיסכון',
      'הפקדה': 'חיסכון',
      'השקעה': 'חיסכון',
      'pension': 'חיסכון',
      'savings': 'חיסכון',

      // לא מסווג
      'לא מסווג': 'לא מסווג',
      'uncategorized': 'לא מסווג',
      'unknown': 'לא מסווג',
    };

    return categoryMap[trimmed] || 'לא מסווג';
  }

  private async resolveUserAiConfig(userId: string): Promise<UserAiConfig> {
    return this.usersService.getAiConfig(userId) as unknown as UserAiConfig;
  }
}
