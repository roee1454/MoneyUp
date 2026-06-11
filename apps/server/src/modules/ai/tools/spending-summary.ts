import { Injectable } from '@nestjs/common';
import { ScraperService } from '../../scraper/scraper.service';

import { ToolRunner, ToolRegistry } from './tool-registry';

/**
 * AI Tool Runner executing tasks for GetSpendingSummary.
 */
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

      const isCreditCard = (bankId: string) => {
        const id = String(bankId ?? '').toLowerCase();
        return id === 'max' || id === 'isracard' || id === 'cal';
      };

      const filteredCategoryTransactions: Record<string, any[]> = {};
      const filteredCategories: any[] = [];
      let totalExpenses = 0;

      for (const catName in spendingData.categoryTransactions || {}) {
        const txns = (spendingData.categoryTransactions[catName] || []).filter((t: any) =>
          isCreditCard(t.bankId),
        );
        if (txns.length > 0) {
          const catAmount = txns.reduce((sum: number, t: any) => sum + t.amount, 0);
          filteredCategoryTransactions[catName] = txns;
          totalExpenses += catAmount;

          const originalCat = (spendingData.categories || []).find((c: any) => c.name === catName);
          if (originalCat) {
            filteredCategories.push({
              ...originalCat,
              amount: catAmount,
              count: txns.length,
            });
          }
        }
      }
      filteredCategories.sort((a, b) => b.amount - a.amount);

      const categoriesWithTopMerchants = filteredCategories.map(
        (cat: any) => {
          const txns = filteredCategoryTransactions[cat.name] || [];
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
        totalExpenses,
        totalBalance: spendingData.totalBalance,
        categories: categoriesWithTopMerchants,
      };
    } catch (e) {
      console.error(`Tool ${this.name} execution failed`, e);
      return { error: 'Internal error executing tool.' };
    }
  }
}
