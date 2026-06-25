import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CircleNotch, Sparkle, Info } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AiModelDropdownSelector } from '@/features/ai/components/AiModelDropdownSelector';
import { DashboardRangePicker } from './DashboardRangePicker';
import { PremiumButton } from '@/components/ui/premium-button';
import { useAnnotateSpendingScansProgress, useUnresolvedMerchantsCount } from '@/hooks/useAiSpending';
import {
  AgentProvider,
  OpenAiModels,
  ClaudeModels,
  GeminiModels,
  OllamaModels,
  ALL_PROVIDERS,
  getModelPricing,
  resolveAutoModel,
} from '@money-up/common';

const MODELS_BY_PROVIDER: Record<string, string[]> = {
  openai: OpenAiModels,
  claude: ClaudeModels,
  gemini: GeminiModels,
  ollama: OllamaModels,
};

interface AiClassificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: string;
  endDate: string;
  configuredProviders?: string[];
  onAnnotatingChange: (isPending: boolean) => void;
}

export function AiClassificationDialog({
  open,
  onOpenChange,
  startDate,
  endDate,
  configuredProviders = [],
  onAnnotatingChange,
}: AiClassificationDialogProps) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [diagStartDate, setDiagStartDate] = useState(startDate);
  const [diagEndDate, setDiagEndDate] = useState(endDate);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDiagStartDate(startDate);
      setDiagEndDate(endDate);
    }
  }

  const [classProvider, setClassProvider] = useState<AgentProvider>(() => {
    const saved = localStorage.getItem('moneyup_classification_provider');
    if (saved === 'openai' || saved === 'claude' || saved === 'gemini' || saved === 'ollama') {
      return saved;
    }
    return 'gemini';
  });

  const [classModel, setClassModel] = useState<string>(() => {
    const saved = localStorage.getItem('moneyup_classification_model');
    if (saved) return saved;
    return 'gemini-2.5-flash';
  });

  const [prevProvidersHash, setPrevProvidersHash] = useState(() => configuredProviders.join(','));
  const currentProvidersHash = configuredProviders.join(',');
  if (currentProvidersHash !== prevProvidersHash) {
    setPrevProvidersHash(currentProvidersHash);
    if (configuredProviders.length > 0) {
      const savedProvider = localStorage.getItem('moneyup_classification_provider') as AgentProvider | null;
      const savedModel = localStorage.getItem('moneyup_classification_model');

      const targetProvider =
        savedProvider && configuredProviders.includes(savedProvider)
          ? savedProvider
          : configuredProviders.includes(classProvider)
          ? classProvider
          : (configuredProviders[0] as AgentProvider) || 'gemini';

      setClassProvider(targetProvider);

      const availableModels = MODELS_BY_PROVIDER[targetProvider] || [];
      if (savedModel && availableModels.includes(savedModel)) {
        setClassModel(savedModel);
      } else {
        const defaultModel =
          targetProvider === 'openai'
            ? 'gpt-4o-mini'
            : targetProvider === 'claude'
            ? 'claude-3-5-haiku-20241022'
            : targetProvider === 'gemini'
            ? 'gemini-2.5-flash'
            : MODELS_BY_PROVIDER[targetProvider]?.[0] || '';
        setClassModel(defaultModel);
      }
    }
  }

  const handleProviderChange = (provider: AgentProvider) => {
    if (!configuredProviders.includes(provider)) {
      toast.error(`ספק ${provider.toUpperCase()} אינו מחובר.`, {
        action: {
          label: 'להגדרות',
          onClick: () => void navigate({ to: '/settings/ai' }),
        },
      });
      return;
    }

    setClassProvider(provider);
    localStorage.setItem('moneyup_classification_provider', provider);
    const defaultModel =
      provider === 'openai'
        ? 'gpt-4o-mini'
        : provider === 'claude'
        ? 'claude-3-5-haiku-20241022'
        : provider === 'gemini'
        ? 'gemini-2.5-flash'
        : MODELS_BY_PROVIDER[provider]?.[0] || '';

    setClassModel(defaultModel);
    localStorage.setItem('moneyup_classification_model', defaultModel);
  };

  const handleModelChange = (model: string) => {
    setClassModel(model);
    localStorage.setItem('moneyup_classification_model', model);
  };

  const {
    mutateAsync: annotateWithAiSocket,
    isPending: isAnnotatingSocket,
  } = useAnnotateSpendingScansProgress();

  // Bubble up the loading state to the parent component
  useEffect(() => {
    onAnnotatingChange(isAnnotatingSocket);
  }, [isAnnotatingSocket, onAnnotatingChange]);

  // Live unresolved merchant count for the dialog's own date range.
  const {
    count: uncategorizedCount,
    isLoading: isMerchantsLoading,
  } = useUnresolvedMerchantsCount(diagStartDate, diagEndDate, open);

  const tokenEstimation = useMemo(() => {
    const N = uncategorizedCount;
    if (N === 0) return { input: 0, output: 0, total: 0, batches: 0, estimatedUsd: null };
    const SYSTEM_PROMPT_TOKENS = 478;
    const INPUT_PER_MERCHANT = 18;
    const OUTPUT_PER_MERCHANT = 35;
    const batches = Math.ceil(N / 50);
    const input = (batches * SYSTEM_PROMPT_TOKENS) + (N * INPUT_PER_MERCHANT);
    const output = N * OUTPUT_PER_MERCHANT;

    const activeModel = classModel === 'auto'
      ? resolveAutoModel(classProvider, 'classification')
      : classModel;

    const pricing = getModelPricing(activeModel);
    const estimatedUsd = pricing
      ? (input / 1_000_000) * pricing.inputPer1M + (output / 1_000_000) * pricing.outputPer1M
      : null;
    return { input, output, total: input + output, batches, estimatedUsd };
  }, [uncategorizedCount, classModel, classProvider]);

  const handleRunClassification = async () => {
    try {
      const activeModel = classModel === 'auto'
        ? resolveAutoModel(classProvider, 'classification')
        : classModel;

      await annotateWithAiSocket({
        startDate: diagStartDate,
        endDate: diagEndDate,
        provider: classProvider,
        model: activeModel,
      });
      toast.success('הסיווג החכם הושלם בהצלחה!');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'הסיווג נכשל';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isAnnotatingSocket) {
        onOpenChange(val);
      }
    }}>
      <DialogContent className="rounded-none border border-border bg-card text-foreground max-w-lg shadow-2xl p-6 text-right font-semibold" dir="rtl" showCloseButton={!isAnnotatingSocket}>
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <DialogHeader className="text-right space-y-1.5 border-b border-border/40 pb-4">
            <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <Sparkle className="h-5 w-5 text-primary" weight="fill" />
              סיווג עסקאות חכם (AI)
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              בחרו ספק, דגם וטווח תאריכים להפעלת סיווג אוטומטי של עסקאות לא מסווגות.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">

            {/* AI Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black text-muted-foreground block">ספק ודגם AI</label>
              <AiModelDropdownSelector
                selectedProvider={classProvider}
                setSelectedProvider={handleProviderChange}
                selectedModel={classModel}
                setSelectedModel={handleModelChange}
                modelsByProvider={MODELS_BY_PROVIDER}
                providers={ALL_PROVIDERS}
                isLoading={isAnnotatingSocket}
                configuredProviders={configuredProviders}
                className="w-full h-10"
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-xs font-black text-muted-foreground block">טווח תאריכים לסיווג</label>
              <div className="border border-border/60 bg-muted/5 px-3 py-2">
                <DashboardRangePicker
                  startDate={diagStartDate}
                  endDate={diagEndDate}
                  onStartDateChange={setDiagStartDate}
                  onEndDateChange={setDiagEndDate}
                  isBusy={isAnnotatingSocket}
                  className="w-full"
                  pickerClassName="flex-1 h-10"
                />
              </div>
            </div>

            <motion.div
              layout
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={cn(
                "border p-4 rounded-none text-sm leading-relaxed",
                isMerchantsLoading
                  ? "border-border/60 bg-muted/10 text-muted-foreground animate-pulse"
                  : uncategorizedCount === 0
                    ? "border-border/60 bg-muted/10 text-muted-foreground"
                    : "bg-primary/5 text-foreground border-primary/30"
              )}
            >
              {isMerchantsLoading ? (
                <div className="flex items-center gap-2">
                  <CircleNotch className="h-4 w-4 shrink-0 animate-spin" />
                  <span>טוען נתונים לטווח התאריכים...</span>
                </div>
              ) : uncategorizedCount === 0 ? (
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-muted-foreground" weight="bold" />
                  <span>אין ביתי עסק לא מסווגים בטווח זה. הכל מסווג!</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="font-black text-primary">נמצאו <span className="text-xl">{uncategorizedCount}</span> בתי עסק ייחודיים שטרם סווגו.</p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    עלות טוקנים מוערכת: <span className="font-bold text-foreground">{tokenEstimation.total.toLocaleString()} טוקנים</span>
                    {' '}(~{tokenEstimation.input.toLocaleString()} קלט, ~{tokenEstimation.output.toLocaleString()} פלט ב-{tokenEstimation.batches} סבבים).
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    עלות כספית מוערכת:{' '}
                    {classProvider === 'ollama' ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">חינם (מקומי)</span>
                    ) : tokenEstimation.estimatedUsd !== null ? (
                      <span className="font-bold text-foreground" dir="ltr">
                        ${tokenEstimation.estimatedUsd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </span>
                    ) : (
                      <span className="font-bold text-muted-foreground">עלות לא ידועה</span>
                    )}
                  </p>
                </div>
              )}
            </motion.div>

            {isAnnotatingSocket && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="flex items-center justify-center gap-3 border border-border/60 bg-muted/10 p-5 rounded-none"
              >
                <CircleNotch className="h-5 w-5 animate-spin text-primary" weight="bold" />
                <span className="text-sm font-bold text-foreground">מבצע סיווג חכם... אנא המתן.</span>
              </motion.div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-4">
            <motion.button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isAnnotatingSocket}
              whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              className="inline-flex h-10 cursor-pointer items-center justify-center border border-border bg-background px-5 text-sm font-black text-foreground hover:bg-muted/40 transition-colors rounded-none"
            >
              ביטול
            </motion.button>
            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              className="inline-block"
            >
              <PremiumButton
                type="button"
                onClick={() => { void handleRunClassification(); }}
                disabled={uncategorizedCount === 0 || isAnnotatingSocket || isMerchantsLoading}
                className="h-10 px-6 rounded-none font-black text-sm"
              >
                {isAnnotatingSocket ? (
                  <CircleNotch className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkle className="h-4 w-4" weight="fill" />
                )}
                <span>הפעל סיווג</span>
              </PremiumButton>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
