import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AiIcon, type AiProvider } from './AiIcon';
import { getFriendlyModelName, ModelTags } from '@money-up/common';
import { cn } from '@/lib/utils';
import { CaretDown, Check } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

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

const getTagStyles = (tag: string) => {
  const t = tag.toLowerCase();
  if (t.includes('thinking') || t.includes('reasoning')) {
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
  }
  if (t.includes('efficient') || t.includes('lightweight') || t.includes('fast')) {
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
  }
  if (t.includes('balanced')) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
  }
  return 'bg-primary/10 text-primary border border-primary/20';
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

  // If configuredProviders is not passed, treat it as true so we don't disable the trigger
  const hasProviders = !configuredProviders || configuredProviders.length > 0;
  const isTriggerDisabled = isLoading || !hasProviders;

  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  }[providers.length] || 'grid-cols-5';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isTriggerDisabled}
          className={cn(
            'flex items-center justify-between w-48 h-[38px] rounded-none border border-border/80 bg-background text-xs font-bold tracking-tight shadow-sm px-3 hover:border-foreground/30 hover:bg-muted/10 transition-all cursor-pointer select-none shrink-0 relative overflow-hidden group',
            open && 'border-primary ring-1 ring-primary/20 bg-muted/5',
            isTriggerDisabled && 'pointer-events-none opacity-60',
          )}
          dir="rtl"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AiIcon
              provider={selectedProvider}
              size="xs"
              className={cn(
                'shrink-0 border-none bg-transparent',
                !hasProviders && 'grayscale opacity-50',
              )}
            />
            <span className="truncate font-bold text-foreground text-[11px] block text-right">
              {hasProviders && selectedModel
                ? getFriendlyModelName(selectedModel).length > 16
                  ? getFriendlyModelName(selectedModel).substring(0, 14) + '...'
                  : getFriendlyModelName(selectedModel)
                : 'לא מחובר ספק'}
            </span>
          </div>
          <CaretDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground/80 mr-1.5 shrink-0 transition-transform duration-300',
              open && 'rotate-180',
            )}
            weight="bold"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        className="w-[380px] p-4 rounded-none border border-border bg-card/98 backdrop-blur-md text-right flex flex-col gap-4 shadow-2xl"
      >
        <div dir="rtl" className="flex flex-col gap-4">
          {/* Providers Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              <span>ספק בינה מלאכותית</span>
              <div className="h-px bg-border/40 flex-grow" />
            </div>
            <div className={cn('grid gap-1.5', colsClass)}>
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
                      'relative flex flex-col items-center justify-center gap-1.5 p-2 border text-center transition-all cursor-pointer rounded-none outline-none select-none h-16 w-full',
                      isSelected
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-border/40 hover:bg-muted/30 hover:border-foreground/30 text-muted-foreground hover:text-foreground',
                      !isConfigured &&
                        'opacity-20 cursor-not-allowed hover:bg-transparent border-dashed border-border/20 text-muted-foreground/40',
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeProviderBg"
                        className="absolute inset-0 bg-primary/5 border border-primary pointer-events-none"
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      />
                    )}
                    <AiIcon
                      provider={p}
                      size="xs"
                      className={cn(
                        'border-none shadow-none bg-transparent',
                        !isConfigured && 'grayscale',
                      )}
                    />
                    <span className="text-[9px] font-black tracking-tight leading-none uppercase z-10">
                      {PROVIDER_LABELS[p] || p}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Models Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
              <span>בחר מודל</span>
              <div className="h-px bg-border/40 flex-grow" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedProvider}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar"
              >
                {models.map((m) => {
                  const isSelected = selectedModel === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleModelSelect(m)}
                      className={cn(
                        'relative flex flex-col items-start justify-between p-3 border text-right transition-all cursor-pointer rounded-none outline-none select-none h-[68px] w-full',
                        isSelected
                          ? 'border-primary text-primary bg-primary/5'
                          : 'border-border/40 hover:bg-muted/30 hover:border-foreground/30 text-muted-foreground hover:text-foreground',
                      )}
                      title={getFriendlyModelName(m)}
                    >
                      {isSelected && (
                        <>
                          <motion.div
                            layoutId="activeModelBg"
                            className="absolute inset-0 bg-primary/5 border border-primary pointer-events-none"
                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          />
                          <Check
                            className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-primary z-10"
                            weight="bold"
                          />
                        </>
                      )}
                      <span className="text-xs font-black leading-tight truncate w-[85%] z-10">
                        {getFriendlyModelName(m)}
                      </span>
                      {ModelTags[m] ? (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider mt-1.5 self-start rounded-xs z-10',
                            getTagStyles(ModelTags[m]),
                          )}
                        >
                          {ModelTags[m]}
                        </span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground font-bold mt-1.5 self-start z-10">
                          מודל רגיל
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
