import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AiIcon, type AiProvider } from '@/components/AiIcon';
import { useSaveAiConfig } from '@/hooks/useAi';
import { toast } from 'sonner';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

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
  };
}

const MODELS_BY_PROVIDER: Record<AiProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4', 'gpt-4o-mini'],
  claude: ['Sonnet 4.5', 'Opus 4.6'],
  gemini: ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'],
};

const PRESETS = {
  accurate: { label: 'מדויק', temp: 0.1, tokens: 4096, desc: 'דיוק מקסימלי, מתאים לסיווג עסקאות מורכבות' },
  moderate: { label: 'מאוזן', temp: 0.5, tokens: 2048, desc: 'איזון בין יצירתיות לדיוק' },
  save_tokens: { label: 'חסכוני', temp: 0.7, tokens: 1024, desc: 'מינימום שימוש בטוקנים, מתאים למשימות פשוטות' },
  custom: { label: 'מותאם אישית', desc: 'הגדר פרמטרים באופן ידני' },
};

export function AiProviderConfigDialog({ provider, open, onOpenChange, currentConfig }: AiProviderConfigDialogProps) {
  const [model, setModel] = useState(currentConfig?.model || MODELS_BY_PROVIDER[provider][0]);
  const [preset, setPreset] = useState<'accurate' | 'moderate' | 'save_tokens' | 'custom'>(currentConfig?.preset || 'moderate');
  const [temperature, setTemperature] = useState(currentConfig?.temperature ?? 0.5);
  const [maxTokens, setMaxTokens] = useState(currentConfig?.maxTokens ?? 2048);
  const [stream, setStream] = useState(currentConfig?.stream ?? true);
  
  const saveAiConfig = useSaveAiConfig();

  useEffect(() => {
    if (preset !== 'custom') {
      const p = PRESETS[preset as keyof typeof PRESETS] as any;
      setTemperature(p.temp);
      setMaxTokens(p.tokens);
    }
  }, [preset]);

  const handleSave = () => {
    saveAiConfig.mutate({
      provider,
      apiKey: '***', // Backend will use existing key if this is placeholder
      preferredModel: model,
      config: {
        model,
        preset,
        temperature,
        maxTokens,
        stream,
      }
    }, {
      onSuccess: () => {
        toast.success(`הגדרות ${provider.toUpperCase()} עודכנו בהצלחה`);
        onOpenChange(false);
      },
      onError: () => {
        toast.error('שגיאה בשמירת ההגדרות');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none p-6" dir="rtl" showCloseButton={false}>
        <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center gap-3">
            <AiIcon provider={provider} size="md" />
            <div className="text-right">
              <DialogTitle className="text-base font-black text-zinc-950 dark:text-white uppercase">
                הגדרות {provider}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                קונפיגורציה מתקדמת עבור ספק הבינה המלאכותית
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Model Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-zinc-900 dark:text-white">מודל עבודה</label>
            <Select value={model} onValueChange={setModel}>
              {MODELS_BY_PROVIDER[provider].map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </Select>
          </div>

          {/* Preset Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-zinc-900 dark:text-white">פרופיל עבודה (Preset)</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
                <button
                  key={key}
                  onClick={() => setPreset(key)}
                  className={cn(
                    "relative flex flex-col p-3 text-right border transition-all group",
                    preset === key 
                      ? "border-indigo-600 bg-indigo-50/10 dark:bg-indigo-600/5 ring-1 ring-indigo-600/20" 
                      : "border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10 hover:border-zinc-200 dark:hover:border-zinc-800"
                  )}
                >
                  <span className={cn(
                    "text-[11px] font-black",
                    preset === key ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {PRESETS[key].label}
                  </span>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-zinc-900 text-white text-[9px] font-bold rounded-none opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                    {PRESETS[key].desc}
                    {key !== 'custom' && (
                      <div className="mt-1 flex gap-2 border-t border-white/10 pt-1 text-white/60">
                        <span>Temp: {(PRESETS[key] as any).temp}</span>
                        <span>Tokens: {(PRESETS[key] as any).tokens}</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Settings */}
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase">טמפרטורה (0-1)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="h-10 w-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 px-3 text-xs font-bold focus:bg-white dark:focus:bg-zinc-950 focus:outline-none transition-all rounded-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase">טוקנים מקסימליים</label>
                <input
                  type="number"
                  min="1"
                  max="32000"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="h-10 w-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 px-3 text-xs font-bold focus:bg-white dark:focus:bg-zinc-950 focus:outline-none transition-all rounded-none"
                />
              </div>
            </div>
          )}

          {/* Streaming Toggle */}
          <div className="flex items-center justify-between p-4 border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10">
            <div className="space-y-0.5 text-right">
              <label className="text-xs font-black text-zinc-900 dark:text-white block">שימוש ב-Streaming</label>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">הצג תשובות בזמן אמת ככל שהן נוצרות</p>
            </div>
            <Switch checked={stream} onCheckedChange={setStream} />
          </div>

          <Button
            onClick={handleSave}
            disabled={saveAiConfig.isPending}
            className="w-full h-11 bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 rounded-none font-black text-xs transition-all shadow-xl shadow-zinc-950/10 dark:shadow-none"
          >
            {saveAiConfig.isPending ? <CircleNotch className="h-4 w-4 animate-spin" /> : 'שמור הגדרות'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
