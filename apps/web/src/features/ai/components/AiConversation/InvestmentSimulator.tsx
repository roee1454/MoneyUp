import { useState } from 'react';

interface InvestmentSimulatorProps {
  assetA: string;
  assetB: string;
  taxRateA: number;
  taxRateB: number;
  terA: number;
  terB: number;
  isAccumulatingA?: boolean;
  isAccumulatingB?: boolean;
  currency?: 'USD' | 'ILS';
}

export function InvestmentSimulator({
  assetA,
  assetB,
  taxRateA,
  taxRateB,
  terA,
  terB,
  isAccumulatingA = true,
  isAccumulatingB = false,
  currency = 'USD',
}: InvestmentSimulatorProps) {
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(1500);
  const [years, setYears] = useState(30);
  const [grossGrowthReturn, setGrossGrowthReturn] = useState(8); // as percentage (8%)
  const [grossDividendReturn, setGrossDividendReturn] = useState(1.5); // as percentage (1.5%)

  // Expose the parameters to the UI
  const [localTaxRateA, setLocalTaxRateA] = useState(taxRateA * 100);
  const [localTaxRateB, setLocalTaxRateB] = useState(taxRateB * 100);
  const [localTerA, setLocalTerA] = useState(terA);
  const [localTerB, setLocalTerB] = useState(terB);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const calculateOutcome = (taxRatePercent: number, terPercent: number) => {
    const growth = grossGrowthReturn / 100;
    const dividend = grossDividendReturn / 100;
    const taxRate = taxRatePercent / 100;
    const ter = terPercent / 100;

    // Net Return Calculation: Growth + Dividend - Tax Drag - TER
    const taxDrag = dividend * taxRate;
    const netReturn = growth + dividend - taxDrag - ter;

    // Calculate Monthly Rate from Annual Net Return
    const monthlyRate = Math.pow(1 + netReturn, 1 / 12) - 1;
    const totalMonths = years * 12;

    let total = initialInvestment;
    for (let i = 0; i < totalMonths; i++) {
      total = total * (1 + monthlyRate) + monthlyContribution;
    }

    return Math.round(total);
  };

  const outcomeA = calculateOutcome(localTaxRateA, localTerA);
  const outcomeB = calculateOutcome(localTaxRateB, localTerB);

  const difference = Math.abs(outcomeA - outcomeB);
  const winner = outcomeA > outcomeB ? assetA : assetB;

  const maxOutcome = Math.max(outcomeA, outcomeB);
  const heightA = (outcomeA / maxOutcome) * 100;
  const heightB = (outcomeB / maxOutcome) * 100;

  const currencySymbol = currency === 'USD' ? '$' : '₪';

  return (
    <div className="mt-3 border border-border/50 bg-background rounded-xl p-5 shadow-xs font-sans dir-rtl w-full">
      {/* Title & Short Description */}
      <div className="mb-3 space-y-1">
        <h4 className="text-base font-black uppercase tracking-tight text-foreground">
          סימולטור השקעה: {assetA} מול {assetB}
        </h4>
        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
          סימולציה של שווי התיק הכולל בסוף התקופה (לפני מס רווח הון בעת המכירה).
        </p>
      </div>

      {/* Visual Results on Top (Comparison Section) */}
      <div className="flex items-end justify-around min-h-20 max-h-30 mb-4 pb-4 border-b border-border/40 mt-2">
        <div className="flex flex-col items-center gap-2 w-1/3">
          <div
            className="w-full bg-primary/20 rounded-t-md relative flex items-end justify-center transition-all duration-500 ease-out"
            style={{ height: `${heightA}%` }}
          >
            <div className="absolute -top-7 text-sm font-black text-foreground md:text-xl whitespace-nowrap">
              {currencySymbol}{outcomeA.toLocaleString()}
            </div>
          </div>
          <span className="text-sm font-black whitespace-nowrap flex items-center gap-1.5">
            {assetA}
            <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
              {isAccumulatingA ? 'צוברת' : 'מחלקת'}
            </span>
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 w-1/3">
          <div
            className="w-full bg-primary rounded-t-md relative flex items-end justify-center transition-all duration-500 ease-out shadow-lg shadow-primary/20"
            style={{ height: `${heightB}%` }}
          >
            <div className="absolute -top-7 text-sm font-black text-foreground md:text-xl whitespace-nowrap">
              {currencySymbol}{outcomeB.toLocaleString()}
            </div>
          </div>
          <span className="text-sm font-black whitespace-nowrap flex items-center gap-1.5">
            {assetB}
            <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
              {isAccumulatingB ? 'צוברת' : 'מחלקת'}
            </span>
          </span>
        </div>
      </div>

      {/* Core Controls */}
      <div className="space-y-4 px-1">
        {/* Initial Investment */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold">הפקדה ראשונית:</span>
            <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-xs px-2 py-1 rounded border border-border shadow-xs">
              <span className="text-muted-foreground font-medium text-xs">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(Number(e.target.value))}
                className="w-18 bg-transparent text-primary font-black outline-none text-left dir-ltr text-xs"
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100000"
            step="5000"
            value={initialInvestment}
            onChange={(e) => setInitialInvestment(Number(e.target.value))}
            className="custom-slider w-full"
          />
        </div>

        {/* Monthly Contribution */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold">הפקדה חודשית:</span>
            <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-xs px-2 py-1 rounded border border-border shadow-xs">
              <span className="text-muted-foreground font-medium text-xs">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-18 bg-transparent text-primary font-black outline-none text-left dir-ltr text-xs"
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="10000"
            step="500"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            className="custom-slider w-full"
          />
        </div>

        {/* Investment Period */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold">תקופת השקעה (שנים):</span>
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-14 bg-background/60 backdrop-blur-xs px-2 py-1 rounded border border-border shadow-xs text-primary font-black outline-none text-center text-xs"
            />
          </div>
          <input
            type="range"
            min="5"
            max="40"
            step="1"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="custom-slider w-full"
          />
        </div>
      </div>

      {/* Advanced Settings Accordion */}
      <div className="mt-4 pt-1 border-t border-border/30 text-center">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1 py-1"
        >
          {showAdvanced ? 'הסתר הגדרות מתקדמות ▲' : 'הצג הגדרות מתקדמות ▼'}
        </button>
      </div>

      {showAdvanced && (
        <div className="mt-3 p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Market Growth */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold">תשואת שוק שנתית:</span>
                <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-xs px-2 py-1 rounded border border-border/60">
                  <input
                    type="number"
                    step="0.1"
                    value={grossGrowthReturn}
                    onChange={(e) =>
                      setGrossGrowthReturn(Number(e.target.value))
                    }
                    className="w-14 bg-transparent text-primary font-black outline-none text-left dir-ltr text-xs"
                  />
                  <span className="text-muted-foreground font-medium text-[10px]">
                    %
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={grossGrowthReturn}
                onChange={(e) => setGrossGrowthReturn(Number(e.target.value))}
                className="custom-slider w-full"
              />
            </div>

            {/* Dividend Yield */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold">תשואת דיבידנד שנתית:</span>
                <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-xs px-2 py-1 rounded border border-border/60">
                  <input
                    type="number"
                    step="0.1"
                    value={grossDividendReturn}
                    onChange={(e) =>
                      setGrossDividendReturn(Number(e.target.value))
                    }
                    className="w-14 bg-transparent text-primary font-black outline-none text-left dir-ltr text-xs"
                  />
                  <span className="text-muted-foreground font-medium text-[10px]">
                    %
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={grossDividendReturn}
                onChange={(e) => setGrossDividendReturn(Number(e.target.value))}
                className="custom-slider w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-border/20">
            {/* Dividend Tax */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold">מס על דיבידנד:</span>
              <div className="flex gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-muted-foreground text-center font-bold">
                    {assetA}
                  </span>
                  <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-xs px-2 py-1 rounded border border-border/60">
                    <input
                      type="number"
                      step="1"
                      value={localTaxRateA}
                      onChange={(e) => setLocalTaxRateA(Number(e.target.value))}
                      className="w-14 bg-transparent text-primary font-black outline-none text-left dir-ltr text-xs"
                    />
                    <span className="text-muted-foreground text-[9px]">%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-muted-foreground text-center font-bold">
                    {assetB}
                  </span>
                  <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-xs px-2 py-1 rounded border border-border/60">
                    <input
                      type="number"
                      step="1"
                      value={localTaxRateB}
                      onChange={(e) => setLocalTaxRateB(Number(e.target.value))}
                      className="w-14 bg-transparent text-primary font-black outline-none text-left dir-ltr text-xs"
                    />
                    <span className="text-muted-foreground text-[9px]">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TER / Management Fees */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold">דמי ניהול (TER):</span>
              <div className="flex gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-muted-foreground text-center font-bold">
                    {assetA}
                  </span>
                  <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-xs px-2 py-1 rounded border border-border/60">
                    <input
                      type="number"
                      step="0.01"
                      value={localTerA}
                      onChange={(e) => setLocalTerA(Number(e.target.value))}
                      className="w-14 bg-transparent text-primary font-black outline-none text-left dir-ltr text-xs"
                    />
                    <span className="text-muted-foreground text-[9px]">%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-muted-foreground text-center font-bold">
                    {assetB}
                  </span>
                  <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-xs px-2 py-1 rounded border border-border/60">
                    <input
                      type="number"
                      step="0.01"
                      value={localTerB}
                      onChange={(e) => setLocalTerB(Number(e.target.value))}
                      className="w-14 bg-transparent text-primary font-black outline-none text-left dir-ltr text-xs"
                    />
                    <span className="text-muted-foreground text-[9px]">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="mt-5 pt-3 border-t border-border text-center">
        <p className="text-sm font-bold leading-relaxed">
          <span className="text-muted-foreground">הפער לטובת</span>{' '}
          <span className="text-primary font-black mx-1">{winner}</span>{' '}
          <span className="text-muted-foreground">
            אחרי {years} שנים יעמוד על כ-
          </span>
          <span className="text-foreground text-base font-black mr-1">
            {currencySymbol}
            {difference.toLocaleString()}
          </span>
        </p>
      </div>
    </div>
  );
}

export function InvestmentSimulatorSkeleton() {
  return (
    <div className="mt-3 border border-border/50 bg-background rounded-xl p-5 shadow-xs font-sans dir-rtl w-full animate-pulse">
      {/* Title & Short Description Skeleton */}
      <div className="mb-4 space-y-2">
        <div className="h-4 bg-muted rounded-full w-1/3" />
        <div className="h-3 bg-muted rounded-full w-1/2" />
      </div>

      {/* Visual Results Skeleton */}
      <div className="flex items-end justify-around h-[160px] mb-4 pb-4 border-b border-border/40 mt-2">
        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="w-16 bg-muted/40 rounded-t-md h-[80px]" />
          <div className="h-3 bg-muted rounded-full w-12" />
        </div>

        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="w-16 bg-muted/60 rounded-t-md h-[120px]" />
          <div className="h-3 bg-muted rounded-full w-12" />
        </div>
      </div>

      {/* Core Controls Skeleton */}
      <div className="space-y-5 px-1 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-3 bg-muted rounded-full w-1/5" />
              <div className="h-5 bg-muted rounded w-16" />
            </div>
            <div className="h-2 bg-muted rounded-full w-full" />
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="mt-5 pt-3 border-t border-border flex justify-center">
        <div className="h-3 bg-muted rounded-full w-1/2" />
      </div>
    </div>
  );
}
