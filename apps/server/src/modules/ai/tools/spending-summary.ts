import { Injectable } from '@nestjs/common';
import { ScraperService } from '../../scraper/scraper.service';

import { ToolRunner, ToolRegistry } from './tool-registry';

@Injectable()
export class GetSpendingSummaryRunner implements ToolRunner {
  readonly name = 'get_spending_summary';

  constructor(
    private readonly scraperService: ScraperService,
    private readonly registry: ToolRegistry,
  ) {
    this.registry.register(this);
  }

  async execute(userId: string, args: any): Promise<any> {
    try {
      const { accounts } = await this.scraperService.getConnectedAccounts({
        userId,
        startDate: args.startDate,
        endDate: args.endDate,
      });

      if (!accounts || accounts.length === 0) {
        return {
          error: 'No connected accounts or transactions found for this period.',
        };
      }

      const spendingData = await this.scraperService.scanIncome({
        accounts,
        startDate: args.startDate,
        endDate: args.endDate,
        period: 'current',
        debug: false,
      });

      const categoriesWithTopMerchants = (spendingData.categories || []).map(
        (cat: any) => {
          const txns = spendingData.categoryTransactions[cat.name] || [];
          const merchantTotals = txns.reduce((acc: any, t: any) => {
            acc[t.merchant] = (acc[t.merchant] || 0) + t.amount;
            return acc;
          }, {});

          const topMerchants = Object.entries(merchantTotals)
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 10)
            .map(([merchant, amount]) => ({ merchant, amount }));

          return {
            ...cat,
            topMerchants,
          };
        },
      );

      return {
        totalIncome: spendingData.totalIncome,
        totalExpenses: spendingData.totalExpenses,
        totalBalance: spendingData.totalBalance,
        categories: categoriesWithTopMerchants,
      };
    } catch (e) {
      console.error(`Tool ${this.name} execution failed`, e);
      return { error: 'Internal error executing tool.' };
    }
  }
}
