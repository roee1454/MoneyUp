import { Injectable } from '@nestjs/common';
import { ScraperService } from '../../scraper/scraper.service';

import { ToolRunner, ToolRegistry } from './tool-registry';

@Injectable()
export class ListAccountsRunner implements ToolRunner {
  readonly name = 'list_connected_accounts';

  constructor(
    private readonly scraperService: ScraperService,
    private readonly registry: ToolRegistry,
  ) {
    this.registry.register(this);
  }

  async execute(userId: string, _args: any): Promise<any> {
    try {
      // Use the metadata endpoint which pulls from the vault directly —
      // so ALL connected banks appear regardless of recent transaction activity.
      const accounts: any[] = await this.scraperService.getAllConnectedAccountsMetadata({ userId });

      if (!accounts || accounts.length === 0) {
        return { accounts: [], count: 0, message: 'No connected bank accounts found.' };
      }

      const summary = accounts.map((acc) => ({
        bankId: acc.bankId,
        accountNumber: acc.accountNumber,
        last4: acc.accountNumber ? String(acc.accountNumber).replace(/\D/g, '').slice(-4) : null,
        balance: acc.balance,
        lastScrapedAt: acc.lastScrapedAt ?? null,
      }));

      return {
        accounts: summary,
        count: summary.length,
      };
    } catch (e) {
      console.error(`Tool ${this.name} execution failed`, e);
      return { error: 'Internal error fetching connected accounts.' };
    }
  }
}
