import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Sparkle, CircleNotch, CaretDown, CaretUp } from '@phosphor-icons/react';
import { AiModelDropdownSelector } from '@/features/ai/components/AiModelDropdownSelector';
import { PremiumButton } from '@/components/ui/premium-button';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { api } from '@/lib/api';
import { OPENAI_MODELS, GEMINI_MODELS } from '@money-up/common';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import ReactMarkdown from 'react-markdown';

const MODELS_BY_PROVIDER: Record<string, string[]> = {
  openai: OPENAI_MODELS,
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  gemini: GEMINI_MODELS,
};

interface Position {
  ticker: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
}

interface PositionsTableProps {
  positions: Position[];
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ positions, selectedTicker, onSelectTicker }) => {
  const session = useAppStore((s) => s.session);
  const { data: userProfile } = useUserProfile(session?.userId);
  const configuredProviders = (userProfile?.configuredProviders ?? []) as string[];
  const navigate = useNavigate();

  const [classProvider, setClassProvider] = useState<'openai' | 'claude' | 'gemini'>(() => {
    const saved = localStorage.getItem('moneyup_investments_provider');
    if (saved && configuredProviders.includes(saved)) {
      return saved as 'openai' | 'claude' | 'gemini';
    }
    return (configuredProviders[0] as 'openai' | 'claude' | 'gemini') || 'gemini';
  });

  const [classModel, setClassModel] = useState<string>(() => {
    const saved = localStorage.getItem('moneyup_investments_model');
    if (saved) return saved;
    const provider = (configuredProviders[0] as 'openai' | 'claude' | 'gemini') || 'gemini';
    if (provider === 'openai') return 'gpt-4o-mini';
    if (provider === 'claude') return 'claude-3-5-haiku-20241022';
    return 'gemini-2.5-flash';
  });

  useEffect(() => {
    if (configuredProviders.length > 0 && !configuredProviders.includes(classProvider)) {
      const fallbackProvider = configuredProviders[0] as 'openai' | 'claude' | 'gemini';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClassProvider(fallbackProvider);
      let defaultModel = 'gemini-2.5-flash';
      if (fallbackProvider === 'openai') defaultModel = 'gpt-4o-mini';
      else if (fallbackProvider === 'claude') defaultModel = 'claude-3-5-haiku-20241022';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClassModel(defaultModel);
    }
  }, [configuredProviders, classProvider]);

  const handleProviderChange = (provider: 'openai' | 'claude' | 'gemini') => {
    if (!configuredProviders.includes(provider)) {
      toast.error(`ספק ${provider.toUpperCase()} אינו מחובר.`, {
        action: { label: 'להגדרות', onClick: () => void navigate({ to: '/settings/ai' }) },
      });
      return;
    }
    setClassProvider(provider);
    localStorage.setItem('moneyup_investments_provider', provider);
    let defaultModel = 'gemini-2.5-flash';
    if (provider === 'openai') defaultModel = 'gpt-4o-mini';
    else if (provider === 'claude') defaultModel = 'claude-3-5-haiku-20241022';
    setClassModel(defaultModel);
    localStorage.setItem('moneyup_investments_model', defaultModel);
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiOpinions, setAiOpinions] = useState<Record<string, string>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleAnalyze = async () => {
    if (!configuredProviders.includes(classProvider)) {
      toast.error('אנא חבר ספק AI בהגדרות');
      return;
    }

    setIsAnalyzing(true);
    setExpandedRows(new Set(positions.map(p => p.ticker)));

    try {
      const positionsData = positions.map(p => `${p.ticker}: Avg Price $${p.avgPrice}, Current Price $${p.currentPrice}`).join('\n');
      
      const prompt = `
Please act as an expert financial advisor and technical analyst. 
Analyze the following portfolio positions:
${positionsData}

For each ticker, provide a brief (2-3 sentences max) technical and fundamental opinion. Consider the average price vs current price. 
Return the result strictly as a JSON object where the keys are the tickers and the values are the opinion strings in Hebrew (עברית). Do not include any markdown formatting around the JSON (like \`\`\`json). Just the raw JSON object.
`;

      const response = await api.post<{ text: string }>('/ai/prompt', {
        provider: classProvider,
        model: classModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        maxTokens: 1024,
      });

      let responseText = response.text || '{}';
      // Clean up markdown wrapper if model ignored instructions
      if (responseText.includes('```json')) {
        responseText = responseText.split('```json')[1].split('```')[0].trim();
      } else if (responseText.includes('```')) {
        responseText = responseText.split('```')[1].split('```')[0].trim();
      }

      const parsed = JSON.parse(responseText);
      setAiOpinions(parsed);
      toast.success('הניתוח הושלם בהצלחה');
    } catch (e) {
      console.error('Failed to analyze portfolio', e);
      toast.error('שגיאה בניתוח התיק');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleExpand = (ticker: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  return (
    <Card className="border-border/50 shadow-sm bg-card overflow-hidden rounded-none">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-foreground">החזקות נוכחיות</CardTitle>
        <div className="flex items-center gap-2">
          {configuredProviders.length > 0 && (
            <div className={cn(
              "flex items-center gap-2 border border-border/80 bg-background p-1.5 rounded-none shadow-xs",
              isAnalyzing && "pointer-events-none opacity-60"
            )}>
              <AiModelDropdownSelector
                selectedProvider={classProvider}
                setSelectedProvider={(p) => handleProviderChange(p as 'openai' | 'claude' | 'gemini')}
                selectedModel={classModel}
                setSelectedModel={(m) => {
                  setClassModel(m);
                  localStorage.setItem('moneyup_investments_model', m);
                }}
                modelsByProvider={MODELS_BY_PROVIDER}
                providers={['gemini', 'openai', 'claude']}
                isLoading={isAnalyzing}
              />
              <PremiumButton
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                size="sm"
                className="h-8.5 px-5 rounded-none border-none shadow-sm font-black text-xs min-w-[140px] cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95"
              >
                {isAnalyzing ? (
                  <CircleNotch className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkle className="h-4 w-4" weight="fill" />
                )}
                <span>{isAnalyzing ? 'מנתח...' : 'ניתוח חכם'}</span>
              </PremiumButton>
            </div>
          )}
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border/50">
            <tr>
              <th className="p-4 py-3">סימול</th>
              <th className="p-4 py-3">כמות מניות</th>
              <th className="p-4 py-3">מחיר ממוצע</th>
              <th className="p-4 py-3">מחיר נוכחי</th>
              <th className="p-4 py-3">רווח לא ממומש</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {positions.map((pos) => {
              const pnl = (pos.currentPrice - pos.avgPrice) * pos.shares;
              const pnlPercent = ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100;
              const isSelected = selectedTicker === pos.ticker;
              const isExpanded = expandedRows.has(pos.ticker);
              const opinion = aiOpinions[pos.ticker];
              
              return (
                <React.Fragment key={pos.ticker}>
                  <tr 
                    className={cn(
                      "hover:bg-muted/30 cursor-pointer transition-colors",
                      isSelected && "bg-primary/5 hover:bg-primary/10"
                    )}
                    onClick={() => onSelectTicker(pos.ticker)}
                  >
                    <td className="p-4 py-3 font-bold text-foreground flex items-center gap-2">
                      {pos.ticker}
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </td>
                    <td className="p-4 py-3 text-muted-foreground">{pos.shares}</td>
                    <td className="p-4 py-3 text-muted-foreground">${pos.avgPrice.toFixed(2)}</td>
                    <td className="p-4 py-3 text-foreground font-medium">${pos.currentPrice.toFixed(2)}</td>
                    <td className={`p-4 py-3 font-semibold ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'} ltr:text-left`} dir="ltr">
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                    </td>
                    <td className="p-4 py-3 text-center">
                      {(opinion || isAnalyzing) && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleExpand(pos.ticker); }}
                          className="p-1 hover:bg-muted rounded-full"
                        >
                          {isExpanded ? <CaretUp weight="bold" /> : <CaretDown weight="bold" />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && opinion && (
                    <tr className={cn("bg-muted/10", isSelected && "bg-primary/5")}>
                      <td colSpan={6} className="p-4 py-4 px-6 border-t-0 text-sm">
                        <div className="flex gap-3">
                          <Sparkle className="h-5 w-5 text-primary shrink-0 mt-0.5" weight="duotone" />
                          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                            <ReactMarkdown>{opinion}</ReactMarkdown>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {isExpanded && isAnalyzing && !opinion && (
                    <tr className={cn("bg-muted/10", isSelected && "bg-primary/5")}>
                      <td colSpan={6} className="p-4 py-6 text-center border-t-0">
                        <CircleNotch className="h-5 w-5 animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
