import { Injectable } from '@nestjs/common';
import { ScraperService } from '../../scraper/scraper.service';

import { ToolRunner, ToolRegistry } from './tool-registry';

@Injectable()
export class QueryTransactionsRunner implements ToolRunner {
  readonly name = 'query_transactions';

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

      // Filter accounts by bankId / accountNumber / last4 if requested
      const bankIdFilter = args.bankId
        ? String(args.bankId).toLowerCase()
        : null;
      const accountNumberFilter = args.accountNumber
        ? String(args.accountNumber)
        : null;
      const last4Filter = args.last4
        ? String(args.last4).replace(/\D/g, '').slice(-4)
        : null;

      const filteredAccounts = accounts.filter((acc) => {
        if (bankIdFilter && String(acc.bankId ?? '').toLowerCase() !== bankIdFilter) {
          return false;
        }
        if (accountNumberFilter && String(acc.accountNumber ?? '') !== accountNumberFilter) {
          return false;
        }
        if (last4Filter && !String(acc.accountNumber ?? '').replace(/\D/g, '').endsWith(last4Filter)) {
          return false;
        }
        return true;
      });

      if (filteredAccounts.length === 0) {
        return {
          error:
            `No accounts matched the filter (bankId="${args.bankId ?? ''}", accountNumber="${args.accountNumber ?? ''}", last4="${args.last4 ?? ''}"). ` +
            `Use list_connected_accounts to see available accounts.`,
        };
      }

      const spendingData = await this.scraperService.scanIncome({
        accounts: filteredAccounts,
        startDate: args.startDate,
        endDate: args.endDate,
        period: 'current',
        debug: false,
      });

      const isCreditCard = (bankId: string) => {
        const id = String(bankId ?? '').toLowerCase();
        return id === 'max' || id === 'isracard' || id === 'cal';
      };

      const allTxns: any[] = [];
      for (const catName in spendingData.categoryTransactions || {}) {
        const txns = (spendingData.categoryTransactions[catName] || [])
          .filter((t: any) => isCreditCard(t.bankId))
          .map((t: any) => ({
            ...t,
            type: 'expense',
          }));
        allTxns.push(...txns);
      }

      if (spendingData.incomeTransactions) {
        const incomes = (spendingData.incomeTransactions || []).map((t: any) => ({
          ...t,
          type: 'income',
        }));
        allTxns.push(...incomes);
      }

      const typeFilter = args.type || 'all';
      let typeFiltered = allTxns;
      if (typeFilter === 'expense') {
        typeFiltered = allTxns.filter((t) => t.type === 'expense');
      } else if (typeFilter === 'income') {
        typeFiltered = allTxns.filter((t) => t.type === 'income');
      }

      // Filter by merchant names if provided (fuzzy/substring matching)
      const selectedMerchants = args.merchantNames && args.merchantNames.length > 0
        ? (args.merchantNames as string[])
            .map((m) => (m || '').toLowerCase().replace(/[^a-z0-9א-ת]/g, ''))
            .filter((m) => m.length > 0)
        : null;

      const filtered = selectedMerchants && selectedMerchants.length > 0
        ? typeFiltered.filter((t) => {
            const cleanMerchant = (t.merchant || '').toLowerCase().replace(/[^a-z0-9א-ת]/g, '');
            return selectedMerchants.some((q) => cleanMerchant.includes(q) || q.includes(cleanMerchant));
          })
        : typeFiltered;

      const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);

      return {
        totalAmount,
        count: filtered.length,
        bankId: bankIdFilter ?? 'all',
        transactions: filtered
          .sort((a, b) => (b.date > a.date ? 1 : -1))
          .slice(0, args.limit || 50)
          .map((t) => ({
            ...t,
            bankId: t.bankId ?? bankIdFilter ?? '',
          })),
      };
    } catch (e) {
      console.error(`Tool ${this.name} execution failed`, e);
      return { error: 'Internal error executing tool.' };
    }
  }
}
