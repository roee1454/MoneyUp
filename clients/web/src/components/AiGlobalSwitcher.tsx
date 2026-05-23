import { useUserProfile } from '@/hooks/useUsers';
import { useAppStore } from '@/store';
import { useSaveAiConfig } from '@/hooks/useAi';
import { AiIcon, type AiProvider } from '@/components/AiIcon';
import { Select, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CircleNotch, Robot } from '@phosphor-icons/react';
import { toast } from 'sonner';

const MODELS_BY_PROVIDER: Record<AiProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4', 'gpt-4o-mini'],
  claude: ['Sonnet 4.5', 'Opus 4.6'],
  gemini: ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'],
};

export function AiGlobalSwitcher() {
  const session = useAppStore((s) => s.session);
  const { data: userProfile, isLoading } = useUserProfile(session?.userId);
  const saveAiConfig = useSaveAiConfig();

  if (isLoading || !userProfile) {
    return (
      <div className="h-10 w-full flex items-center justify-center border border-border bg-muted animate-soft-shimmer">
        <CircleNotch className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const configuredProviders = (userProfile.configuredProviders ??
    []) as AiProvider[];
  const activeProvider = userProfile.activeAiProvider as AiProvider | null;
  const configs = userProfile.aiProviderConfigs || {};

  if (configuredProviders.length === 0) {
    return (
      <div className="h-10 w-full flex items-center gap-2 border border-border bg-muted px-3 opacity-50">
        <Robot className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] font-bold text-muted-foreground">
          אין ספק AI מוגדר
        </span>
      </div>
    );
  }

  const handleSwitch = (provider: AiProvider) => {
    const config = configs[provider] || {
      model: MODELS_BY_PROVIDER[provider][0],
      preset: 'moderate',
    };

    saveAiConfig.mutate(
      {
        provider,
        apiKey: '***',
        preferredModel: config.model,
        activeProvider: provider,
        config,
      },
      {
        onSuccess: () => {
          toast.success(`ספק AI הוחלף ל-${provider.toUpperCase()}`);
        },
      },
    );
  };

  const handleModelChange = (model: string) => {
    if (!activeProvider) return;
    const config = configs[activeProvider] || {
      model,
      preset: 'moderate',
    };
    config.model = model;

    saveAiConfig.mutate(
      {
        provider: activeProvider,
        apiKey: '***',
        preferredModel: model,
        activeProvider,
        config,
      },
      {
        onSuccess: () => {
          toast.success(`מודל הוחלף ל-${model}`);
        },
      },
    );
  };

  return (
    <div className="space-y-1.5" dir="rtl">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {configuredProviders.map((p) => (
          <button
            key={p}
            onClick={() => handleSwitch(p)}
            className={cn(
              'flex flex-col items-center justify-center p-2 border transition-all min-w-[64px]',
              activeProvider === p
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-accent hover:text-foreground',
            )}
          >
            <AiIcon
              provider={p}
              size="sm"
              className={cn(activeProvider === p && 'brightness-110')}
            />
            <span
              className={cn(
                'text-[8px] font-black mt-1 uppercase tracking-tighter',
                activeProvider === p
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {p}
            </span>
          </button>
        ))}
      </div>

      {activeProvider && (
        <Select
          value={
            configs[activeProvider]?.model ||
            MODELS_BY_PROVIDER[activeProvider][0]
          }
          onValueChange={handleModelChange}
          className="h-8"
        >
          {MODELS_BY_PROVIDER[activeProvider].map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </Select>
      )}
    </div>
  );
}
