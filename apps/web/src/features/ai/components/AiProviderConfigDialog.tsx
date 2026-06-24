import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const aiConfigFormSchema = z.object({
  preset: z.enum(['accurate', 'moderate', 'save_tokens', 'custom']),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().int().min(1).max(32000),
  stream: z.boolean(),
});

type AiConfigFormValues = z.infer<typeof aiConfigFormSchema>;

export function AiProviderConfigDialog({
  provider,
  open,
  onOpenChange,
  currentConfig,
}: AiProviderConfigDialogProps) {
  const model = currentConfig?.model || MODELS_BY_PROVIDER[provider][0];
  const forceMarkdown = true;

  const saveAiConfig = useSaveAiConfig();

  const { control, handleSubmit, setValue, watch, reset } = useForm<AiConfigFormValues>({
    resolver: zodResolver(aiConfigFormSchema),
    defaultValues: {
      preset: 'moderate',
      temperature: 0.5,
      maxTokens: 2048,
      stream: true,
    },
  });

  const preset = watch('preset');

  useEffect(() => {
    if (open) {
      reset({
        preset: currentConfig?.preset || 'moderate',
        temperature: currentConfig?.temperature ?? 0.5,
        maxTokens: currentConfig?.maxTokens ?? 2048,
        stream: currentConfig?.stream ?? true,
      });
    }
  }, [open, currentConfig, reset]);

  useEffect(() => {
    if (preset && preset !== 'custom') {
      const p = PRESETS[preset] as any;
      setValue('temperature', p.temp);
      setValue('maxTokens', p.tokens);
    }
  }, [preset, setValue]);

  const handleSave = (values: AiConfigFormValues) => {
    saveAiConfig.mutate(
      {
        provider,
        apiKey: '***',
        preferredModel: model,
        config: {
          model,
          preset: values.preset,
          temperature: values.temperature,
          maxTokens: values.maxTokens,
          stream: values.stream,
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

        <form onSubmit={handleSubmit(handleSave)} className="py-6 space-y-6">
          {/* Preset Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-foreground block text-right">
              פרופיל עבודה (Preset)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setValue('preset', key)}
                    className={cn(
                      'relative flex flex-col p-3 text-right border transition-all group cursor-pointer',
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
                    <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-foreground text-background text-[9px] font-bold rounded-none opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl text-right">
                      {PRESETS[key].desc}
                      {key !== 'custom' && (
                        <div className="mt-1 flex gap-2 border-t border-background/20 pt-1 text-background/80 justify-end">
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
              <div className="space-y-2 text-right">
                <label className="text-[10px] font-black text-muted-foreground uppercase">
                  טמפרטורה (0-1)
                </label>
                <Controller
                  name="temperature"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={value}
                      onChange={(e) => onChange(Number(e.target.value))}
                      className="h-10 w-full border border-border bg-background/50 px-3 text-xs font-bold focus:bg-background focus:outline-none transition-all rounded-none text-foreground"
                    />
                  )}
                />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-[10px] font-black text-muted-foreground uppercase">
                  טוקנים מקסימליים
                </label>
                <Controller
                  name="maxTokens"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <input
                      type="number"
                      min="1"
                      max="32000"
                      value={value}
                      onChange={(e) => onChange(Number(e.target.value))}
                      className="h-10 w-full border border-border bg-background/50 px-3 text-xs font-bold focus:bg-background focus:outline-none transition-all rounded-none text-foreground"
                    />
                  )}
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
            <Controller
              name="stream"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Switch checked={value} onCheckedChange={onChange} />
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={saveAiConfig.isPending}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-none font-black text-xs transition-all shadow-xl shadow-primary/10"
          >
            {saveAiConfig.isPending ? (
              <CircleNotch className="h-4 w-4 animate-spin" />
            ) : (
              'שמור הגדרות'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
