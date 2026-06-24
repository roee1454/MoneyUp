import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check } from '@phosphor-icons/react';
import { AiIcon, type AiProvider } from './AiIcon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useSaveAiConfig,
  useVerifyAiConnection,
} from '@/hooks/useAi';
import { PremiumInput } from '@/components/ui/premium-input';
import { PremiumCard } from '@/components/ui/premium-card';
import { PremiumGridButton } from '@/components/ui/premium-grid-button';

type Provider = AiProvider;

interface AddAiProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const providerLabels: Record<Provider, string> = {
  openai: 'OpenAI',
  claude: 'Anthropic Claude',
  gemini: 'Gemini',
  ollama: 'Ollama (מקומי)',
};

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  claude: 'claude-3-5-haiku-20241022',
  gemini: 'gemini-2.5-flash',
  ollama: 'qwen2.5:14b-instruct',
};

const addAiProviderSchema = z.object({
  apiKey: z.string().trim().optional(),
});

type AddAiProviderFormValues = z.infer<typeof addAiProviderSchema>;

export function AddAiProviderDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddAiProviderDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState('');

  const verifyMutation = useVerifyAiConnection();
  const saveMutation = useSaveAiConfig();

  const { control, handleSubmit, reset, watch } = useForm<AddAiProviderFormValues>({
    resolver: zodResolver(addAiProviderSchema),
    defaultValues: {
      apiKey: '',
    },
  });

  const apiKey = watch('apiKey') || '';
  const canVerify = !!selectedProvider && (selectedProvider === 'ollama' || apiKey.trim().length > 0);

  useEffect(() => {
    if (open) {
      reset({ apiKey: '' });
      setIsDone(false);
      setError('');
      setSelectedProvider(null);
    }
  }, [open, reset]);

  async function handleVerify(values: AddAiProviderFormValues) {
    if (!selectedProvider) return;
    const resolvedKey = selectedProvider === 'ollama' && !values.apiKey?.trim() ? 'http://localhost:11434/v1' : (values.apiKey ?? '');
    setError('');
    try {
      const res = await verifyMutation.mutateAsync({
        provider: selectedProvider,
        apiKey: resolvedKey,
      });
      if (!res.success) {
        setError('בדיקת החיבור נכשלה');
        return;
      }

      const defaultModel = DEFAULT_MODELS[selectedProvider];
      await saveMutation.mutateAsync({
        provider: selectedProvider,
        apiKey: resolvedKey,
        preferredModel: defaultModel,
        config: {
          model: defaultModel,
          preset: 'moderate',
          temperature: 0.5,
          maxTokens: 2048,
          stream: true,
        },
      });

      setIsDone(true);
      onSuccess?.();
    } catch {
      setError('בדיקת החיבור או השמירה נכשלה');
    }
  }

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl"
        dir="rtl"
      >
        {isDone && selectedProvider ? (
          <ConnectedView
            provider={selectedProvider}
            providerName={providerLabels[selectedProvider]}
            onClose={handleClose}
          />
        ) : !selectedProvider ? (
          <div className="space-y-5">
            <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
              <DialogTitle className="text-xl font-black text-foreground">
                חיבור עוזר AI חדש
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground">
                סנכרן באופן מאובטח מפתח API עבור סוכן הבינה המלאכותית שלך
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 pt-2">
              {(['openai', 'claude', 'gemini', 'ollama'] as const).map((provider) => (
                <PremiumGridButton
                  key={provider}
                  onClick={() => {
                    setSelectedProvider(provider);
                    setError('');
                  }}
                  label={providerLabels[provider]}
                  icon={<AiIcon provider={provider} size="sm" />}
                />
              ))}
            </div>
          </div>
        ) : verifyMutation.isPending || saveMutation.isPending ? (
          <SyncingView
            provider={selectedProvider}
            providerName={providerLabels[selectedProvider]}
          />
        ) : (
          <form onSubmit={handleSubmit(handleVerify)} className="animate-in fade-in-50 duration-200 slide-in-from-bottom-2 space-y-4">
            <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <AiIcon provider={selectedProvider} size="md" />
                <div>
                  <DialogTitle className="text-lg font-black text-foreground">
                    התחברות ל-{providerLabels[selectedProvider]}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-semibold text-muted-foreground">
                    הזן את מפתח ה-API כדי לאמת את החיבור
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5 text-right">
                <label className="text-sm font-bold text-muted-foreground block">
                  {selectedProvider === 'ollama' ? 'כתובת שרת / מפתח API' : 'מפתח API'}
                </label>
                <Controller
                  name="apiKey"
                  control={control}
                  render={({ field }) => (
                    <PremiumInput
                      {...field}
                      isPassword={selectedProvider !== 'ollama'}
                      placeholder={selectedProvider === 'ollama' ? 'http://localhost:11434/v1 (או השאר ריק)' : 'sk-...'}
                      dir="ltr"
                    />
                  )}
                />
              </div>

              <PremiumCard variant="warning">
                <p className="text-sm font-black text-foreground/70 leading-relaxed">
                  מפתח ה-API אינו מועבר לשום צד שלישי. הוא מוצפן באופן מקומי על
                  המחשב שלך בלבד!
                </p>
              </PremiumCard>

              {error && (
                <p className="text-[11px] font-bold text-destructive mt-2 bg-destructive/10 p-2.5 border border-destructive/20 text-right">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3 pt-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
                  onClick={() => {
                    setSelectedProvider(null);
                    reset({ apiKey: '' });
                    setError('');
                  }}
                >
                  חזרה
                </Button>
                <Button
                  type="submit"
                  disabled={!canVerify}
                  className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                >
                  בדוק חיבור
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SyncingView({
  provider,
  providerName,
}: {
  provider: Provider;
  providerName: string;
}) {
  return (
    <div className="animate-in fade-in-50 duration-300 slide-in-from-bottom-1 min-h-[320px] flex flex-col items-center justify-center text-center gap-6">
      <div className="relative flex items-center justify-center h-44 w-44">
        <span className="absolute h-32 w-32 rounded-full border border-border animate-ping [animation-duration:1.8s]" />
        <span className="absolute h-24 w-24 rounded-full border border-border animate-ping [animation-duration:1.8s] [animation-delay:350ms]" />
        <span className="absolute h-16 w-16 rounded-full bg-muted animate-pulse" />
        <AiIcon
          provider={provider}
          size="xl"
          className="relative z-10 animate-pulse"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-black text-foreground">בודק חיבור...</p>
        <p className="text-xs font-semibold text-muted-foreground">
          {providerName}
        </p>
      </div>
    </div>
  );
}

function ConnectedView({
  provider,
  providerName,
  onClose,
}: {
  provider: Provider;
  providerName: string;
  onClose: () => void;
}) {
  return (
    <div className="animate-in fade-in-50 duration-300 slide-in-from-bottom-1 min-h-[320px] flex flex-col items-center justify-center text-center gap-6">
      <div className="relative flex items-center justify-center h-44 w-44">
        <div className="absolute -top-1 h-11 w-11 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg z-20 border-4 border-card">
          <Check className="h-6 w-6 text-white stroke-3" />
        </div>
        <AiIcon provider={provider} size="xl" className="relative z-10" />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-black text-foreground">
          עוזר AI הוגדר בהצלחה!
        </p>
        <p className="text-xs font-semibold text-muted-foreground">
          {providerName} מוגדר כעת
        </p>
      </div>

      <Button
        type="button"
        onClick={onClose}
        className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-8"
      >
        סגור
      </Button>
    </div>
  );
}
