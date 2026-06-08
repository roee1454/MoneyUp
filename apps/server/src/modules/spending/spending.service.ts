import { Injectable } from '@nestjs/common';
import { ScraperService } from '../scraper/scraper.service';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { SpendingScansResponse, UserAiConfig } from '../../types/gateway.types';
import { SyncJobService } from '../sync/sync-job.service';

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

      if (!response.isCovered) {
        if (
          !this.syncJobService.isRunning(userId) &&
          this.syncJobService.canAutoStartInitial(userId, startDate, endDate)
        ) {
          this.syncJobService.startOrReuseSyncJob(
            userId,
            'initial',
            startDate,
            endDate,
          );
        }
      }
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

  async runSpendingAnnotationPass(
    userId: string,
    period: 'current' | 'previous' | 'both',
    startDate?: string,
    endDate?: string,
    overrideProvider?: 'openai' | 'claude' | 'gemini',
    overrideModel?: string,
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

  private async classifyUnknownMerchantsWithAi(
    userId: string,
    unresolved: Array<{ normalizedMerchant: string; displayMerchant: string }>,
    overrideProvider?: 'openai' | 'claude' | 'gemini',
    overrideModel?: string,
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
    return results;
  }

  private buildMerchantCategorizationPrompt(
    items: Array<{ normalizedMerchant: string; displayMerchant: string }>,
  ): string {
    const categories = [
      'מזון',
      'קניות',
      'בילויים ופנאי',
      'דלק/תחבורה',
      'מנויים',
    ];
    return [
      'You are are an Israeli consumer transaction classification expert.',
      'Your task is to classify Israeli & international merchant names into exactly ONE of the allowed Hebrew categories AND provide 3-5 descriptive English/Hebrew keywords.',
      '',
      `Allowed Hebrew Categories:`,
      '- מזון (Restaurants, cafes, fast food, coffee shops, Wolt, Ten Bis, bars, and pubs where the primary expense is dining or drinking)',
      '- קניות (Supermarkets, groceries, online shopping, clothing, fashion, electronics, KSP, Ivory, Amazon, AliExpress)',
      '- בילויים ופנאי (Entertainment, cinemas, concert tickets, bowling, attractions, parties, and nightlife events. Do NOT place restaurants, cafes, or dining/drinking bars here.)',
      '- דלק/תחבורה (Gas stations, Pango, Cello, public transit, taxis)',
      '- מנויים (Recurring services, Netflix, Spotify, cellular, iCloud)',
      '',
      'Instructions:',
      '1. The "category" field in your output JSON must match EXACTLY one of the allowed Hebrew categories listed above. Do not translate them to English.',
      '2. Do NOT use "לא מסווג" (Unclassified) under any circumstances. You must classify every single merchant into one of the other 5 categories. If you are unsure, make your best educated guess based on the merchant name and typical consumer spending behavior.',
      '3. Return ONLY a valid JSON array of objects. Do NOT include markdown code blocks (e.g. ```json) or any explanations.',
      '',
      'Example Input:',
      '[{"normalizedMerchant":"wolt","displayMerchant":"Wolt"},{"normalizedMerchant":"zara","displayMerchant":"ZARA"}]',
      '',
      'Example Output:',
      '[',
      '  {',
      '    "normalizedMerchant": "wolt",',
      '    "category": "מזון",',
      '    "keywords": "food delivery, restaurants, fast food",',
      '    "confidence": 0.95',
      '  },',
      '  {',
      '    "normalizedMerchant": "zara",',
      '    "category": "קניות",',
      '    "keywords": "clothing, fashion, apparel, shopping",',
      '    "confidence": 0.90',
      '  }',
      ']',
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
      // מזון / Food
      'מזון': 'מזון',
      'food': 'מזון',
      'dining': 'מזון',
      'restaurant': 'מזון',
      'restaurants': 'מזון',
      'cafe': 'מזון',
      'wolt': 'מזון',
      'ten bis': 'מזון',
      'bar': 'מזון',
      'bars': 'מזון',
      'pub': 'מזון',

      // קניות / Shopping (Supermarket + Online + Clothing + Electronics)
      'קניות': 'קניות',
      'shopping': 'קניות',
      'supermarket': 'קניות',
      'groceries': 'קניות',
      'grocery': 'קניות',
      'online shopping': 'קניות',
      'online': 'קניות',
      'clothing': 'קניות',
      'apparel': 'קניות',
      'fashion': 'קניות',
      'shoes': 'קניות',
      'electronics': 'קניות',
      'gadgets': 'קניות',
      'computers': 'קניות',
      'super': 'קניות',
      'amazon': 'קניות',
      'aliexpress': 'קניות',
      'ebay': 'קניות',
      'ביגוד': 'קניות',
      'אלקטרוניקה': 'קניות',
      'אונליין': 'קניות',
      'סופר': 'קניות',

      // בילויים ופנאי / Leisure & Going Out
      'בילויים ופנאי': 'בילויים ופנאי',
      'בילויים': 'בילויים ופנאי',
      'בידור': 'בילויים ופנאי',
      'leisure': 'בילויים ופנאי',
      'entertainment': 'בילויים ופנאי',
      'going out': 'בילויים ופנאי',
      'nightlife': 'בילויים ופנאי',
      'cinema': 'בילויים ופנאי',
      'movies': 'בילויים ופנאי',

      // דלק/תחבורה / Transport
      'דלק/תחבורה': 'דלק/תחבורה',
      'תחבורה': 'דלק/תחבורה',
      'דלק': 'דלק/תחבורה',
      'fuel': 'דלק/תחבורה',
      'transport': 'דלק/תחבורה',
      'transportation': 'דלק/תחבורה',
      'taxi': 'דלק/תחבורה',
      'gas': 'דלק/תחבורה',

      // מנויים / Subscriptions
      'מנויים': 'מנויים',
      'subscriptions': 'מנויים',
      'subscription': 'מנויים',
      'services': 'מנויים',

      // לא מסווג / Unclassified
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
