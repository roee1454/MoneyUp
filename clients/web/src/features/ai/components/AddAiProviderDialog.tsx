import { useMemo, useState } from 'react';
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
  useFetchAiModels,
  useSaveAiConfig,
  useVerifyAiConnection,
} from '@/hooks/useAi';
import { PremiumInput } from '@/components/ui/premium-input';
import { PremiumCard } from '@/components/ui/premium-card';
import { PremiumGridButton } from '@/components/ui/premium-grid-button';
import { Select, SelectItem } from '@/components/ui/select';

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
};

export function AddAiProviderDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddAiProviderDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState('');

  const verifyMutation = useVerifyAiConnection();
  const saveMutation = useSaveAiConfig();
  const modelsQuery = useFetchAiModels(
    isVerified ? (selectedProvider ?? undefined) : undefined,
    isVerified ? apiKey : undefined,
  );

  const models = useMemo(() => modelsQuery.data ?? [], [modelsQuery.data]);
  const canVerify = !!selectedProvider && apiKey.trim().length > 0;

  async function handleVerify() {
    if (!selectedProvider || !apiKey.trim()) return;
    setError('');
    setIsVerified(false);
    setSelectedModel('');
    try {
      const res = await verifyMutation.mutateAsync({
        provider: selectedProvider,
        apiKey,
      });
      if (!res.success) {
        setError('בדיקת החיבור נכשלה');
        return;
      }
      setIsVerified(true);
    } catch {
      setError('בדיקת החיבור נכשלה');
    }
  }

  async function handleSave() {
    if (!selectedProvider || !selectedModel) return;
    setError('');
    try {
      await saveMutation.mutateAsync({
        provider: selectedProvider,
        apiKey,
        preferredModel: selectedModel,
      });
      setIsDone(true);
      onSuccess?.();
    } catch {
      setError('שמירת ההגדרה נכשלה');
    }
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => {
      setApiKey('');
      setSelectedModel('');
      setIsVerified(false);
      setIsDone(false);
      setError('');
      setSelectedProvider(null);
    }, 200);
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
              {(['openai', 'claude', 'gemini'] as const).map((provider) => (
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
        ) : verifyMutation.isPending ? (
          <SyncingView
            provider={selectedProvider}
            providerName={providerLabels[selectedProvider]}
          />
        ) : !isVerified ? (
          <div className="animate-in fade-in-50 duration-200 slide-in-from-bottom-2 space-y-4">
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
                <label className="text-sm font-bold text-muted-foreground">
                  מפתח API
                </label>
                <PremiumInput
                  isPassword
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  dir="ltr"
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
                    setApiKey('');
                    setError('');
                  }}
                >
                  חזרה
                </Button>
                <Button
                  onClick={() => void handleVerify()}
                  disabled={!canVerify}
                  className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                >
                  בדוק חיבור
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in-50 duration-200 slide-in-from-bottom-2 space-y-4">
            <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <AiIcon provider={selectedProvider} size="md" />
                <div>
                  <DialogTitle className="text-lg font-black text-foreground">
                    בחירת מודל מועדף
                  </DialogTitle>
                  <DialogDescription className="text-xs font-semibold text-muted-foreground">
                    בחר מודל ברירת מחדל מתוך רשימת המודלים הזמינים בחשבונך
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5 text-right">
                <label className="text-sm font-bold text-muted-foreground">
                  מודל ברירת מחדל
                </label>
                <Select
                  value={selectedModel}
                  onValueChange={(val) => setSelectedModel(val)}
                  placeholder="Select Model"
                >
                  <SelectItem value="">Select Model</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </Select>
              </div>

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
                    setIsVerified(false);
                    setSelectedModel('');
                    setError('');
                  }}
                  disabled={saveMutation.isPending}
                >
                  חזור לפרטים
                </Button>
                <Button
                  onClick={() => void handleSave()}
                  disabled={!selectedModel || saveMutation.isPending}
                  className="rounded-none font-bold text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  {saveMutation.isPending ? 'שומר...' : 'שמור הגדרות'}
                </Button>
              </div>
            </div>
          </div>
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
        onClick={onClose}
        className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-8"
      >
        סגור
      </Button>
    </div>
  );
}
