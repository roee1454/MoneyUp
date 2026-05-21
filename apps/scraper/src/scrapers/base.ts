import { CompanyTypes, ScraperCredentials } from 'israeli-bank-scrapers';
import { ConfigService } from '@nestjs/config';
import { UnifiedAccount, UnifiedTransaction, ScraperResponse } from '@moneyup/types';

export abstract class BaseScraper {
  abstract readonly companyId: CompanyTypes;
  constructor(protected readonly configService: ConfigService) { }

  async scrape(credentials: ScraperCredentials, startDate: Date): Promise<ScraperResponse> {
    const isSimulation = this.configService.get<string>('SCRAPER_MODE') === 'simulation';
    return isSimulation
      ? this.simulateScrape(credentials)
      : this.liveScrape(credentials, startDate);
  }

  protected abstract simulateScrape(credentials: ScraperCredentials): Promise<ScraperResponse>;
  protected abstract liveScrape(credentials: ScraperCredentials, startDate: Date): Promise<ScraperResponse>;

  protected normalizeAccounts(rawAccounts: any[]): UnifiedAccount[] {
    return rawAccounts.map((account) => {
      const rawTxns = account.txns || [];
      const normalizedTxns: UnifiedTransaction[] = rawTxns.map((txn, index) => {
        const txnDate = txn.date ? new Date(txn.date).toISOString() : new Date().toISOString();
        const processedDate = txn.processedDate
          ? new Date(txn.processedDate).toISOString()
          : txnDate;

        return {
          id: txn.id || `txn_${Date.now()}_${index}`,
          date: txnDate,
          processedDate,
          amount: typeof txn.amount === 'number' ? txn.amount : 0,
          chargedAmount: typeof txn.chargedAmount === 'number' ? txn.chargedAmount : 0,
          description: txn.description || '',
          memo: txn.memo || '',
          originalCurrency: txn.originalCurrency || 'ILS',
        };
      });

      return {
        accountNumber: account.accountNumber || 'unknown',
        balance: typeof account.balance === 'number' ? account.balance : undefined,
        transactions: normalizedTxns,
      };
    });
  }
}
