import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { ToolRunner, ToolRegistry } from './tool-registry';

@Injectable()
export class ListAccountsRunner implements ToolRunner {
  readonly name = 'list_connected_accounts';

  constructor(
    @Inject('SCRAPER_SERVICE') private readonly scraperServiceClient: ClientProxy,
    private readonly registry: ToolRegistry,
  ) {
    this.registry.register(this);
  }

  async execute(userId: string, _args: any): Promise<any> {
    try {
      // Use the metadata endpoint which pulls from the vault directly —
      // so ALL connected banks appear regardless of recent transaction activity.
      const accounts: any[] = await firstValueFrom(
        this.scraperServiceClient
          .send<any[]>('get_all_connected_accounts_metadata', { userId })
          .pipe(timeout(30000)),
      );

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
