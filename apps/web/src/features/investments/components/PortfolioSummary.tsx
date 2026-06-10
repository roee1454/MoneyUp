import React from 'react';
import { DashboardMetricCard } from '../../dashboard/components/DashboardMetricCard';

interface PortfolioSummaryProps {
  portfolio: {
    balance: number;
    dailyPnL: number;
    totalProfit: number;
    totalReturn: number;
  };
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ portfolio }) => {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-4 select-none">
      <DashboardMetricCard
        variant="cell"
        title="שווי התיק"
        value={`$${portfolio.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        tone="zinc"
      />
      <DashboardMetricCard
        variant="cell"
        title="רווח יומי"
        value={`${portfolio.dailyPnL >= 0 ? '+' : ''}$${portfolio.dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        tone={portfolio.dailyPnL >= 0 ? 'emerald' : 'rose'}
      />
      <DashboardMetricCard
        variant="cell"
        title="רווח כולל"
        value={`${portfolio.totalProfit >= 0 ? '+' : ''}$${portfolio.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        tone={portfolio.totalProfit >= 0 ? 'emerald' : 'rose'}
      />
      <DashboardMetricCard
        variant="cell"
        title="תשואה כוללת"
        value={`${portfolio.totalReturn >= 0 ? '+' : ''}${portfolio.totalReturn.toFixed(2)}%`}
        tone={portfolio.totalReturn >= 0 ? 'emerald' : 'rose'}
      />
    </div>
  );
};
