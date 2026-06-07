import { useUserProfile } from '@/hooks/useUsers';
import { useAppStore } from '@/store';
import { useSaveAiConfig } from '@/hooks/useAi';
import { AiIcon, type AiProvider } from './AiIcon';
import { Select, SelectItem } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CircleNotch, Sparkle, CaretDown, Gear } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { OPENAI_MODELS, MODEL_TAGS } from '@money-up/common';
import { getFriendlyModelName } from '@/lib/ai-models';
import { Button } from '@/components/ui/button';

const MODELS_BY_PROVIDER: Record<AiProvider, string[]> = {
  openai: OPENAI_MODELS,
  claude: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ],
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

const ALL_PROVIDERS: AiProvider[] = ['openai', 'claude', 'gemini', 'ollama', 'openrouter'];

export function AiGlobalSwitcher() {
  const session = useAppStore((s) => s.session);
  const { data: userProfile, isLoading } = useUserProfile(session?.userId);
  const saveAiConfig = useSaveAiConfig();
  const navigate = useNavigate();

  if (isLoading || !userProfile) {
    return (
      <div
        className="h-13 w-full flex items-center justify-center border border-border bg-muted/30 animate-soft-shimmer"
        dir="rtl"
      >
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
      <Button
        variant="outline"
        size="sm"
        className="w-full h-13 rounded-none bg-card border border-border text-primary hover:bg-primary/10 hover:border-border transition-all group"
        onClick={() => void navigate({ to: '/settings/ai' })}
        dir="rtl"
      >
        <Sparkle
          className="h-3.5 w-3.5 ml-2 group-hover:animate-pulse"
          weight="fill"
        />
        <span className="text-[11px] font-black uppercase tracking-tight">
          חבר ספק AI עכשיו
        </span>
      </Button>
    );
  }

  // Fallback to first configured if active is null or not configured anymore
  const currentProvider =
    activeProvider && configuredProviders.includes(activeProvider)
      ? activeProvider
      : configuredProviders[0];

  const handleSwitch = (provider: AiProvider) => {
    if (!configuredProviders.includes(provider)) {
      toast.error(`ספק ${provider.toUpperCase()} אינו מחובר.`, {
        action: {
          label: 'להגדרות',
          onClick: () => void navigate({ to: '/settings/ai' }),
        },
      });
      return;
    }

    if (provider === activeProvider) return;

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
    if (!currentProvider) return;
    const config = configs[currentProvider] || {
      model,
      preset: 'moderate',
    };
    config.model = model;

    saveAiConfig.mutate(
      {
        provider: currentProvider,
        apiKey: '***',
        preferredModel: model,
        activeProvider: currentProvider,
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
    <div
      className="flex items-center justify-between border border-border bg-muted/30 p-2 group transition-all hover:border-foreground/20 w-full"
      dir="rtl"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'relative flex items-center justify-center h-9 w-9 shrink-0 transition-all cursor-pointer border border-border bg-background hover:scale-105 active:scale-95',
              )}
            >
              <AiIcon
                provider={currentProvider}
                size="sm"
                className="h-full w-full border-none shadow-none"
              />
              <div className="absolute -bottom-1 -left-1 h-4 w-4 bg-background rounded-full flex items-center justify-center border border-border">
                <CaretDown
                  className="h-2 w-2 text-muted-foreground"
                  weight="bold"
                />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 rounded-md border-border/20"
          >
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-2">
              בחר ספק בינה מלאכותית
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_PROVIDERS.map((p) => {
              const isConfigured = configuredProviders.includes(p);
              const isActive = currentProvider === p;

              return (
                <DropdownMenuItem
                  key={p}
                  onClick={() => handleSwitch(p)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                    isActive && 'bg-primary/5 text-primary',
                  )}
                >
                  <div
                    className={cn(
                      'relative h-7 w-7 rounded-full border border-border overflow-hidden shrink-0',
                      !isConfigured && 'grayscale opacity-40',
                    )}
                  >
                    <AiIcon
                      provider={p}
                      size="sm"
                      className="h-full w-full border-none"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black uppercase leading-none">
                      {p}
                    </span>
                    {!isConfigured && (
                      <span className="text-[9px] font-bold text-rose-500 leading-none mt-1">
                        לא מחובר
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <div className="mr-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1 min-w-0">
          <Select
            value={
              configs[currentProvider]?.model ||
              MODELS_BY_PROVIDER[currentProvider][0]
            }
            onValueChange={handleModelChange}
            className="w-full h-9 border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-xs font-black uppercase tracking-tight shadow-none"
          >
            <SelectItem value="placeholder" className="hidden">
              Placeholder
            </SelectItem>
            {MODELS_BY_PROVIDER[currentProvider].map((m) => (
              <SelectItem
                key={m}
                value={m}
                className="text-[10px] font-black uppercase"
              >
                <div className="flex items-center gap-1.5">
                  <span>{getFriendlyModelName(m)}</span>
                  {MODEL_TAGS[m] && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-primary/10 text-primary rounded-xs tracking-wider">
                      {MODEL_TAGS[m]}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0 mr-2"
        onClick={() => void navigate({ to: '/settings/ai' })}
        title="הגדרות AI"
      >
        <Gear className="h-4 w-4" weight="bold" />
      </Button>
    </div>
  );
}
