import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Switch } from '@/components/ui/switch';
import { AiIcon, type AiProvider } from './AiIcon';
import { useSaveAiConfig } from '@/hooks/useAi';
import { toast } from 'sonner';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { OpenAiModels, GeminiModels } from '@money-up/common';

interface AiProviderConfigDialogProps {
  provider: AiProvider;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig?: {
    model: string;
    preset: 'accurate' | 'moderate' | 'save_tokens' | 'custom';
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    forceMarkdown?: boolean;
  };
}

const MODELS_BY_PROVIDER: Record<AiProvider, string[]> = {
  openai: OpenAiModels,
  claude: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  gemini: GeminiModels,
  ollama: [
    'qwen2.5:14b-instruct',
    'llama3.1:8b',
    'mistral',
    'gemma2',
  ],
  openrouter: [
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemini-2.5-flash',
    'deepseek/deepseek-chat',
    'anthropic/claude-3.5-sonnet',
  ],
};

const PRESETS = {
  accurate: {
    label: 'מדויק',
    temp: 0.1,
    tokens: 4096,
    desc: 'דיוק מקסימלי, מתאים לסיווג עסקאות מורכבות',
  },
  moderate: {
    label: 'מאוזן',
    temp: 0.5,
    tokens: 2048,
    desc: 'איזון בין יצירתיות לדיוק',
  },
  save_tokens: {
    label: 'חסכוני',
    temp: 0.7,
    tokens: 1024,
    desc: 'מינימום שימוש בטוקנים, מתאים למשימות פשוטות',
  },
  custom: { label: 'מותאם אישית', desc: 'הגדר פרמטרים באופן ידני' },
};

export function AiProviderConfigDialog({
  provider,
  open,
  onOpenChange,
  currentConfig,
}: AiProviderConfigDialogProps) {
  const model = currentConfig?.model || MODELS_BY_PROVIDER[provider][0];
  const [preset, setPreset] = useState<
    'accurate' | 'moderate' | 'save_tokens' | 'custom'
  >(currentConfig?.preset || 'moderate');
  const [temperature, setTemperature] = useState(
    currentConfig?.temperature ?? 0.5,
  );
  const [maxTokens, setMaxTokens] = useState(currentConfig?.maxTokens ?? 2048);
  const [stream, setStream] = useState(currentConfig?.stream ?? true);
  const forceMarkdown = true;

  const saveAiConfig = useSaveAiConfig();

  useEffect(() => {
    if (preset !== 'custom') {
      const p = PRESETS[preset as keyof typeof PRESETS] as any;
      setTemperature(p.temp);
      setMaxTokens(p.tokens);
    }
  }, [preset]);

  const handleSave = () => {
    saveAiConfig.mutate(
      {
        provider,
        apiKey: '***', // Backend will use existing key if this is placeholder
        preferredModel: model,
        config: {
          model,
          preset,
          temperature,
          maxTokens,
          stream,
          forceMarkdown,
        },
      },
      {
        onSuccess: () => {
          toast.success(`הגדרות ${provider.toUpperCase()} עודכנו בהצלחה`);
          onOpenChange(false);
        },
        onError: () => {
          toast.error('שגיאה בשמירת ההגדרות');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl"
        dir="rtl"
        showCloseButton={false}
      >
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <AiIcon provider={provider} size="md" />
            <div className="text-right">
              <DialogTitle className="text-base font-black text-foreground uppercase">
                הגדרות {provider}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground">
                קונפיגורציה מתקדמת עבור ספק הבינה המלאכותית
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Preset Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-foreground">
              פרופיל עבודה (Preset)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => setPreset(key)}
                    className={cn(
                      'relative flex flex-col p-3 text-right border transition-all group',
                      preset === key
                        ? 'border-border bg-primary/10 ring-1 ring-primary/20'
                        : 'border-border bg-card hover:border-foreground/20',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] font-black',
                        preset === key
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {PRESETS[key].label}
                    </span>

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-foreground text-background text-[9px] font-bold rounded-none opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                      {PRESETS[key].desc}
                      {key !== 'custom' && (
                        <div className="mt-1 flex gap-2 border-t border-background/20 pt-1 text-background/80">
                          <span>Temp: {(PRESETS[key] as any).temp}</span>
                          <span>Tokens: {(PRESETS[key] as any).tokens}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Custom Settings */}
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase">
                  טמפרטורה (0-1)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="h-10 w-full border border-border bg-background/50 px-3 text-xs font-bold focus:bg-background focus:outline-none transition-all rounded-none text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase">
                  טוקנים מקסימליים
                </label>
                <input
                  type="number"
                  min="1"
                  max="32000"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="h-10 w-full border border-border bg-background/50 px-3 text-xs font-bold focus:bg-background focus:outline-none transition-all rounded-none text-foreground"
                />
              </div>
            </div>
          )}

          {/* Streaming Toggle */}
          <div className="flex items-center justify-between p-4 border border-border bg-muted/30">
            <div className="space-y-0.5 text-right">
              <label className="text-xs font-black text-foreground block">
                שימוש ב-Streaming
              </label>
              <p className="text-[10px] text-muted-foreground font-medium">
                הצג תשובות בזמן אמת ככל שהן נוצרות
              </p>
            </div>
            <Switch checked={stream} onCheckedChange={setStream} />
          </div>



          <Button
            onClick={handleSave}
            disabled={saveAiConfig.isPending}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-none font-black text-xs transition-all shadow-xl shadow-primary/10"
          >
            {saveAiConfig.isPending ? (
              <CircleNotch className="h-4 w-4 animate-spin" />
            ) : (
              'שמור הגדרות'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
