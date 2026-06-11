import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AiIcon, type AiProvider } from './AiIcon';
import { getFriendlyModelName } from '@/lib/ai-models';
import { ModelTags } from '@money-up/common';
import { cn } from '@/lib/utils';
import { CaretUp } from '@phosphor-icons/react';

interface AiModelDropdownSelectorProps {
  selectedProvider: AiProvider;
  setSelectedProvider: (provider: AiProvider) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  modelsByProvider: Record<string, string[]>;
  providers?: AiProvider[];
  isLoading?: boolean;
  configuredProviders?: string[];
}

const PROVIDER_LABELS: Record<AiProvider, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
  ollama: 'Ollama',
  openrouter: 'OpenRouter',
};

export function AiModelDropdownSelector({
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
  modelsByProvider,
  providers = ['gemini', 'openai', 'claude', 'ollama', 'openrouter'],
  isLoading = false,
  configuredProviders,
}: AiModelDropdownSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const models = modelsByProvider[selectedProvider] || [];

  const handleProviderSelect = (p: AiProvider) => {
    if (p === selectedProvider) return;
    setSelectedProvider(p);
    // Auto-select the first model of the new provider
    const firstModel = modelsByProvider[p]?.[0] || '';
    setSelectedModel(firstModel);
  };

  const handleModelSelect = (m: string) => {
    setSelectedModel(m);
    setOpen(false); // Close dropdown when a model is selected
  };

  const hasProviders = configuredProviders && configuredProviders.length > 0;
  const isTriggerDisabled = isLoading || !hasProviders;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isTriggerDisabled}
          className={cn(
            'flex items-center justify-between w-48 h-[38px] rounded-none border border-border/60 bg-background text-xs font-bold tracking-tight shadow-xs px-3 hover:border-border/100 hover:bg-muted/10 transition-colors cursor-pointer select-none shrink-0',
            isTriggerDisabled && 'pointer-events-none opacity-60',
          )}
          dir="rtl"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AiIcon
              provider={selectedProvider}
              size="sm"
              className={cn(
                'shrink-0',
                !hasProviders && 'grayscale opacity-50',
              )}
            />
            <span className="truncate font-bold text-foreground text-[11px] block text-right">
              {hasProviders
                ? getFriendlyModelName(selectedModel).length > 16
                  ? getFriendlyModelName(selectedModel).substring(0, 14) + '...'
                  : getFriendlyModelName(selectedModel)
                : 'לא מחובר ספק'}
            </span>
          </div>
          <CaretUp
            className="h-4 w-4 text-muted-foreground/80 mr-1.5 shrink-0"
            weight="bold"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        className="w-[380px] p-4 rounded-none border border-border bg-card/98 backdrop-blur-md text-right flex flex-col gap-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div dir="rtl" className="flex flex-col gap-4">
          {/* Providers Section */}
          <div>
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
              ספק בינה מלאכותית
            </div>
            <div className="grid grid-cols-3 gap-2">
              {providers.map((p) => {
                const isSelected = selectedProvider === p;
                const isConfigured =
                  !configuredProviders ||
                  configuredProviders.length === 0 ||
                  configuredProviders.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={!isConfigured}
                    onClick={() => handleProviderSelect(p)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 p-3 border text-center transition-all cursor-pointer rounded-none outline-none select-none',
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary shadow-xs'
                        : 'border-border/50 hover:bg-muted/40 hover:border-border text-muted-foreground hover:text-foreground',
                      !isConfigured &&
                        'opacity-30 cursor-not-allowed hover:bg-transparent hover:border-border/50 text-muted-foreground/40',
                    )}
                  >
                    <AiIcon
                      provider={p}
                      size="sm"
                      className={cn(
                        'border-none shadow-none',
                        !isConfigured && 'grayscale',
                      )}
                    />
                    <span className="text-[10px] font-bold tracking-tight">
                      {PROVIDER_LABELS[p] || p}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border/50 w-full" />

          {/* Models Section */}
          <div>
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
              בחר מודל
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-0.5">
              {models.map((m) => {
                const isSelected = selectedModel === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModelSelect(m)}
                    className={cn(
                      'flex flex-col items-center justify-between p-2.5 border text-center transition-all cursor-pointer rounded-none outline-none select-none h-[62px]',
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary shadow-xs'
                        : 'border-border/50 hover:bg-muted/40 hover:border-border text-muted-foreground hover:text-foreground',
                    )}
                    title={getFriendlyModelName(m)}
                  >
                    <span className="text-[10px] font-bold leading-tight truncate w-full">
                      {getFriendlyModelName(m)}
                    </span>
                    {ModelTags[m] ? (
                      <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-primary/10 text-primary rounded-xs tracking-wider shrink-0 mt-1">
                        {ModelTags[m]}
                      </span>
                    ) : (
                      <span className="text-[8px] text-muted-foreground font-bold leading-none shrink-0 mt-1">
                        סטנדרטי
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
