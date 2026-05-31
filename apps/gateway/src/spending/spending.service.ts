import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { SpendingScansResponse, UserAiConfig } from '../types/gateway.types';
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
    @Inject('AI_SERVICE') private readonly aiServiceClient: ClientProxy,
    @Inject('SCRAPER_SERVICE')
    private readonly scraperServiceClient: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersServiceClient: ClientProxy,
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
      const response = await firstValueFrom(
        this.scraperServiceClient
          .send<{ accounts: any[]; isCovered: boolean }>(
            'get_connected_accounts',
            {
              userId,
              startDate,
              endDate,
            },
          )
          .pipe(timeout(60000)),
      );
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

    const scanResult = await firstValueFrom(
      this.scraperServiceClient
        .send<SpendingScansResponse>('spending_scan_income', {
          accounts,
          period,
          startDate,
          endDate,
          debug,
        })
        .pipe(timeout(180000)),
    );

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
  ): Promise<SpendingScansResponse> {
    const response = await firstValueFrom(
      this.scraperServiceClient
        .send<{ accounts: any[]; isCovered: boolean }>(
          'get_connected_accounts',
          {
            userId,
            startDate,
            endDate,
          },
        )
        .pipe(timeout(60000)),
    );
    const accounts = response.accounts ?? [];
    const initial = await firstValueFrom(
      this.scraperServiceClient
        .send<SpendingScansResponse>('spending_scan_income', {
          accounts,
          period,
          startDate,
          endDate,
          debug: false,
        })
        .pipe(timeout(180000)),
    );
    const unresolvedMerchants = initial.unresolvedMerchants ?? [];
    if (unresolvedMerchants.length === 0) {
      return initial;
    }
    const aiCategoryAnnotations = await this.classifyUnknownMerchantsWithAi(
      userId,
      unresolvedMerchants,
    );
    if (aiCategoryAnnotations.length === 0) {
      return initial;
    }
    await firstValueFrom(
      this.scraperServiceClient
        .send('spending_upsert_annotations', {
          annotations: aiCategoryAnnotations,
        })
        .pipe(timeout(60000)),
    );
    return firstValueFrom(
      this.scraperServiceClient
        .send<SpendingScansResponse>('spending_scan_income', {
          accounts,
          period,
          startDate,
          endDate,
          debug: false,
        })
        .pipe(timeout(180000)),
    );
  }

  async markTransactionDuplicate(
    userId: string,
    bankId: string,
    accountNumber: string,
    id: string,
    isDuplicate: boolean,
  ): Promise<void> {
    console.log(`[Gateway] Sending mark_transaction_duplicate for ${id} (duplicate=${isDuplicate})`);
    try {
      await firstValueFrom(
        this.scraperServiceClient
          .send('mark_transaction_duplicate', {
            userId,
            bankId,
            accountNumber,
            id,
            isDuplicate,
          })
          .pipe(timeout(10000)),
      );
      console.log(`[Gateway] Received success response for ${id}`);
    } catch (err) {
      console.error('[SpendingService] Failed to mark duplicate:', err);
      throw err;
    }
  }

  private async classifyUnknownMerchantsWithAi(
    userId: string,
    unresolved: Array<{ normalizedMerchant: string; displayMerchant: string }>,
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
    if (!cfg.activeAiProvider || !cfg.decryptedApiKey || !cfg.preferredModel) {
      return [];
    }

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
      source: 'ai';
      model?: string;
      confidence?: number;
    }> = [];

    for (let i = 0; i < uniqueUnknowns.length; i += this.aiCategoryBatchSize) {
      const chunk = uniqueUnknowns.slice(i, i + this.aiCategoryBatchSize);
      const prompt = this.buildMerchantCategorizationPrompt(chunk);

      if (this.spendingScansDebugEnabled) {
        console.log(`[AI_ANNOTATION] Sending batch of ${chunk.length} merchants to AI`);
      }

      const response = await firstValueFrom(
        this.aiServiceClient
          .send<{ text: string }>('ai_prompt', {
            provider: cfg.activeAiProvider,
            model: cfg.preferredModel,
            prompt,
            apiKey: cfg.decryptedApiKey,
            temperature: 0,
            maxTokens: 2048,
          })
          .pipe(timeout(120000)),
      );

      if (this.spendingScansDebugEnabled) {
        console.log('[AI_ANNOTATION] Raw AI Response:', response?.text);
      }

      const parsed = this.parseCategoryAiResponse(response?.text ?? '');
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
            source: 'ai',
            model: cfg.preferredModel,
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
      'ביגוד',
      'בידור',
      'בילויים',
      'אלקטרוניקה',
      'אונליין',
      'דלק/תחבורה',
      'סופר',
      'מנויים',
    ];
    return [
      'You are a financial expert specializing in Israeli consumer data.',
      'Your task is to classify merchants into exactly one of the provided categories.',
      'Search your knowledge base or the web about these Israeli/International merchants.',
      '',
      `Allowed categories: ${categories.join(', ')}`,
      '',
      'Instructions:',
      '1. Return ONLY a valid JSON array of objects.',
      '2. Each object must have: "normalizedMerchant" (string), "category" (string), and "confidence" (number between 0 and 1).',
      '3. If you are not at least 50% confident about a merchant, set its category to "לא מסווג".',
      '4. Do not include any markdown formatting, preamble, or explanation outside the JSON.',
      '',
      'Merchants to classify:',
      JSON.stringify(items),
    ].join('\n');
  }

  private parseCategoryAiResponse(
    raw: string,
  ): Map<string, { category: string; confidence?: number }> {
    const direct =
      this.tryParseJsonArray(raw) ??
      this.tryParseJsonArray(this.extractJsonBlock(raw));
    const map = new Map<string, { category: string; confidence?: number }>();
    for (const entry of direct ?? []) {
      if (!entry || typeof entry !== 'object') continue;
      const normalizedMerchant = String(
        (entry as any).normalizedMerchant ?? '',
      ).trim();
      if (!normalizedMerchant) continue;
      const category = String((entry as any).category ?? '').trim();
      const confidenceRaw = Number((entry as any).confidence);
      map.set(normalizedMerchant, {
        category,
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
    const allowed = new Set([
      'מזון',
      'ביגוד',
      'בידור',
      'בילויים',
      'אלקטרוניקה',
      'אונליין',
      'דלק/תחבורה',
      'סופר',
      'מנויים',
      'לא מסווג',
    ]);
    if (!category) return 'לא מסווג';
    return allowed.has(category) ? category : 'לא מסווג';
  }

  private async resolveUserAiConfig(userId: string): Promise<UserAiConfig> {
    return firstValueFrom(
      this.usersServiceClient
        .send<UserAiConfig>('user_get_ai_config', userId)
        .pipe(timeout(30000)),
    );
  }
}
