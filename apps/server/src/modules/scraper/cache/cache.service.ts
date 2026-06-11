import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ScrapedCacheEntity } from '../entities/cache.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { VaultEntity } from '../entities/vault.entity';
import { getTodayUtcDateString } from '../utils/date.utils';
import * as crypto from 'crypto';

/**
 * Service providing business logic and database access for Cache.
 */
@Injectable()
export class CacheService {
  constructor(
    @InjectRepository(ScrapedCacheEntity)
    private readonly cacheRepository: Repository<ScrapedCacheEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(VaultEntity)
    private readonly vaultRepository: Repository<VaultEntity>,
  ) {}

  async getCachedAccounts(userId: string): Promise<any[]> {
    return this.getCachedAccountsForRange(userId);
  }

  async getAllCacheEntries(userId: string): Promise<ScrapedCacheEntity[]> {
    return this.cacheRepository.find({ where: { userId } });
  }

  /** Returns the total number of transactions stored in the DB for a given bank,
   *  across all date ranges. Used to detect "covered but empty" accounts. */
  async countTransactionsForAccount(userId: string, bankId: string): Promise<number> {
    return this.transactionRepository.count({ where: { userId, bankId } });
  }

  async getCachedAccountsForRange(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any[]> {
    const cacheEntries = await this.cacheRepository.find({ where: { userId } });
    const vaultEntries = await this.vaultRepository.find({ where: { userId } });
    const vaultMap = new Map(
      vaultEntries.map((v) => [v.bankId, v.lastScrapedAt]),
    );
    const results: any[] = [];

    let startIso = startDate;
    let endIso = endDate;
    const today = getTodayUtcDateString();

    if (!startIso || !endIso) {
      const now = new Date();
      startIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        .toISOString()
        .slice(0, 10);
      endIso = today;
    } else {
      if (endIso > today) {
        endIso = today;
      }
    }

    const startStr = startIso.slice(0, 10);
    const endStr = endIso.slice(0, 10);

    for (const entry of cacheEntries) {
      try {
        const accountsList = JSON.parse(entry.cachedData);
        for (const acc of accountsList) {
          const txns = await this.transactionRepository.find({
            where: {
              userId,
              bankId: entry.bankId,
              accountNumber: acc.accountNumber,
              date: Between(
                `${startStr}T00:00:00.000Z`,
                `${endStr}T23:59:59.999Z`,
              ),
            },
            order: { date: 'DESC' },
          });

          results.push({
            bankId: entry.bankId,
            accountNumber: acc.accountNumber,
            balance: acc.balance,
            lastScrapedAt: vaultMap.get(entry.bankId) ?? null,
            transactions: txns,
          });
        }
      } catch (err) {
        // Skip corrupted caches
      }
    }
    return results;
  }

  async setCachedAccounts(
    userId: string,
    bankId: string,
    accounts: any[],
  ): Promise<void> {
    if (!accounts || accounts.length === 0) {
      console.log(
        `[CacheService] setCachedAccounts: Received empty/null accounts list for ${bankId}, preserving previous cache.`,
      );
      return;
    }
    let cacheEntry = await this.cacheRepository.findOne({
      where: { userId, bankId },
    });
    if (!cacheEntry) {
      cacheEntry = this.cacheRepository.create({ userId, bankId });
    }
    const accountsMetadata = accounts.map((acc) => ({
      accountNumber: acc.accountNumber,
      balance: acc.balance,
      transactions: [],
    }));
    cacheEntry.cachedData = JSON.stringify(accountsMetadata);
    const coverage = this.inferCoverageFromAccounts(accounts);
    cacheEntry.coverageStartDate = coverage.startDate ?? null;
    cacheEntry.coverageEndDate = coverage.endDate ?? null;
    await this.cacheRepository.save(cacheEntry);

    const entitiesToSave: TransactionEntity[] = [];
    for (const acc of accounts ?? []) {
      for (const txn of acc.transactions ?? []) {
        const stableId = this.generateStableTxnId(
          bankId,
          acc.accountNumber,
          txn,
        );
        const entity = this.transactionRepository.create({
          userId,
          bankId,
          accountNumber: acc.accountNumber,
          id: stableId,
          date: txn.date,
          processedDate: txn.processedDate,
          amount: txn.amount,
          chargedAmount: txn.chargedAmount,
          description: txn.description,
          memo: txn.memo,
          originalCurrency: txn.originalCurrency,
        });
        entitiesToSave.push(entity);
      }
    }

    if (entitiesToSave.length > 0) {
      await this.transactionRepository
        .createQueryBuilder()
        .insert()
        .into(TransactionEntity)
        .values(entitiesToSave)
        .orUpdate(
          [
            'date',
            'processedDate',
            'amount',
            'chargedAmount',
            'description',
            'memo',
            'originalCurrency',
          ],
          ['userId', 'bankId', 'accountNumber', 'id'],
        )
        .execute();

      console.log(
        `[CacheService] Saved ${entitiesToSave.length} transactions for ${bankId} (User: ${userId})`,
      );
    } else {
      console.log(
        `[CacheService] No new transactions to save for ${bankId} (User: ${userId})`,
      );
    }
  }

  async markTransactionDuplicate(
    userId: string,
    bankId: string,
    accountNumber: string,
    id: string,
    isDuplicate: boolean,
  ): Promise<void> {
    await this.transactionRepository.update(
      { userId, bankId, accountNumber, id },
      { isDuplicate },
    );
  }

  async removeCachedAccounts(userId: string, bankId: string): Promise<void> {
    await this.cacheRepository.delete({ userId, bankId });
    await this.transactionRepository.delete({ userId, bankId });
  }

  generateStableTxnId(bankId: string, accountNumber: string, txn: any): string {
    if (txn.id && !txn.id.startsWith('txn_')) {
      return txn.id;
    }
    const dateStr = String(txn.date ?? '').slice(0, 10);
    const amountVal = Number(txn.chargedAmount ?? txn.amount ?? 0).toFixed(2);
    const desc = String(txn.description ?? '')
      .trim()
      .toLowerCase();
    const memoStr = String(txn.memo ?? '')
      .trim()
      .toLowerCase();
    const rawKey = `${bankId.toLowerCase()}:${accountNumber}:${dateStr}:${amountVal}:${desc}:${memoStr}`;
    return crypto
      .createHash('sha256')
      .update(rawKey)
      .digest('hex')
      .slice(0, 32);
  }

  private inferCoverageFromAccounts(accounts: any[]): {
    startDate?: string;
    endDate?: string;
  } {
    let minDate: string | undefined;
    let maxDate: string | undefined;

    for (const account of accounts ?? []) {
      for (const txn of account?.transactions ?? []) {
        const dateRaw = String(txn?.date ?? '').slice(0, 10);
        if (!dateRaw || dateRaw.length !== 10) continue;
        if (!minDate || dateRaw < minDate) minDate = dateRaw;
        if (!maxDate || dateRaw > maxDate) maxDate = dateRaw;
      }
    }

    return { startDate: minDate, endDate: maxDate };
  }
}
