import React from 'react';
import { InvestmentsDashboard } from '../features/investments/InvestmentsDashboard';

export const InvestmentsRoute: React.FC = () => {
  return (
    <div className="w-full h-full space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-500" dir="rtl">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">השקעות ומסחר</h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">נהל את תיק ההשקעות שלך בעזרת בינה מלאכותית</p>
      </div>
      <InvestmentsDashboard />
    </div>
  );
};
