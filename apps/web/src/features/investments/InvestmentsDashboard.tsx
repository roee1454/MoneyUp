import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PortfolioSummary } from './components/PortfolioSummary';
import { PositionsTable } from './components/PositionsTable';

import { CircleNotch } from '@phosphor-icons/react';

interface Position {
  ticker: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  dailyChange: number;
}

interface Portfolio {
  balance: number;
  currency: string;
  dailyPnL: number;
  totalProfit: number;
  totalReturn: number;
  positions: Position[];
}

const fetchPortfolio = async () => {
  const data = await api.get<Portfolio>('/market-data/portfolio');
  return data;
};

export const InvestmentsDashboard: React.FC = () => {
  const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');
  const {
    data: portfolio,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[600px] text-muted-foreground gap-4 animate-in fade-in">
        <CircleNotch className="h-8 w-8 animate-spin" />
        <p className="font-semibold text-sm">טוען נתוני תיק חיים...</p>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[600px] text-destructive gap-4">
        <p className="font-semibold text-sm">שגיאה בטעינת נתונים</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <PortfolioSummary portfolio={portfolio} />

      <PositionsTable
        positions={portfolio.positions}
        selectedTicker={selectedTicker}
        onSelectTicker={setSelectedTicker}
      />
    </div>
  );
};
