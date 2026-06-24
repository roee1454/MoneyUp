import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AiIcon, type AiProvider } from './AiIcon';
import { getFriendlyModelName, ModelTags } from '@money-up/common';
import { cn } from '@/lib/utils';
import { CaretDown, Check, Play, Stop, CircleNotch, Sparkle } from '@phosphor-icons/react';
import { useFetchAiModels, useOllamaRunningModels, useStartOllamaModel, useStopOllamaModel } from '@/hooks/useAiConfig';

interface AiModelDropdownSelectorProps {
  selectedProvider: AiProvider;
  setSelectedProvider: (provider: AiProvider) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  modelsByProvider: Record<string, string[]>;
  providers?: AiProvider[];
  isLoading?: boolean;
  configuredProviders?: string[];
  className?: string;
}

const PROVIDER_LABELS: Record<AiProvider, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
  ollama: 'Ollama',
};

const getTagStyles = (tag: string) => {
  const t = tag.toLowerCase();
  if (t.includes('חשיבה')) {
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
  }
  if (t.includes('יעיל') || t.includes('קל') || t.includes('מהיר')) {
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
  }
  if (t.includes('מאוזן')) {
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
  providers = ['gemini', 'openai', 'claude', 'ollama'],
  isLoading = false,
  configuredProviders,
  className,
}: AiModelDropdownSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Dynamically fetch models for Ollama
  const { data: fetchedModels } = useFetchAiModels(
    selectedProvider === 'ollama' ? selectedProvider : undefined
  );

  // Poll currently running Ollama models when dropdown is open and Ollama is selected
  const { data: runningOllamaModels } = useOllamaRunningModels(
    open && selectedProvider === 'ollama'
  );

  const startOllamaModel = useStartOllamaModel();
  const stopOllamaModel = useStopOllamaModel();
  const [busyModel, setBusyModel] = React.useState<string | null>(null);

  const handleStartOllamaModel = async (e: React.MouseEvent, modelName: string) => {
    e.stopPropagation();
    setBusyModel(modelName);
    try {
      await startOllamaModel.mutateAsync({ model: modelName });
    } catch {
      // ignore
    } finally {
      setBusyModel(null);
    }
  };

  const handleStopOllamaModel = async (e: React.MouseEvent, modelName: string) => {
    e.stopPropagation();
    setBusyModel(modelName);
    try {
      await stopOllamaModel.mutateAsync({ model: modelName });
    } catch {
      // ignore
    } finally {
      setBusyModel(null);
    }
  };

  const models = React.useMemo(() => {
    if (selectedProvider === 'ollama') {
      return fetchedModels || [];
    }
    return modelsByProvider[selectedProvider] || [];
  }, [selectedProvider, modelsByProvider, fetchedModels]);

  const handleProviderSelect = (p: AiProvider) => {
    if (p === selectedProvider) return;
    setSelectedProvider(p);
    
    // If auto mode is currently selected, preserve it for hosted providers!
    if (selectedModel === 'auto' && p !== 'ollama') {
      return;
    }

    // If it's a static provider, auto-select the first model immediately
    if (p !== 'ollama') {
      const firstModel = modelsByProvider[p]?.[0] || '';
      setSelectedModel(firstModel);
    } else {
      // Clear selection so the effect can auto-select the newly fetched model
      setSelectedModel('');
    }
  };

  React.useEffect(() => {
    if (selectedProvider === 'ollama' && !selectedModel && fetchedModels && fetchedModels.length > 0) {
      setSelectedModel(fetchedModels[0]);
    }
  }, [fetchedModels, selectedProvider, selectedModel, setSelectedModel]);

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
            'flex items-center justify-between w-48 h-[38px] rounded-none border border-border bg-background text-xs font-bold tracking-tight shadow-sm px-3 hover:border-foreground/30 hover:bg-muted/10 transition-all cursor-pointer select-none shrink-0 relative overflow-hidden group',
            open && 'border-border bg-muted/5',
            isTriggerDisabled && 'pointer-events-none opacity-60',
            selectedModel === 'auto' && 'border-border/80 shadow-xs bg-linear-to-br from-primary/5 to-background',
            className,
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
                ? selectedModel === 'auto'
                  ? 'אוטומטי'
                  : getFriendlyModelName(selectedModel).length > 16
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
                        ? 'border-border text-primary bg-primary/5 shadow-xs'
                        : 'border-border/40 hover:bg-muted/30 hover:border-foreground/30 text-muted-foreground hover:text-foreground',
                      !isConfigured &&
                        'opacity-20 cursor-not-allowed hover:bg-transparent border-dashed border-border/20 text-muted-foreground/40',
                    )}
                  >
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

            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar">
              {models.length === 0 && selectedModel !== 'auto' ? (
                <div className="col-span-2 py-8 text-center text-[11px] font-bold text-muted-foreground/60 leading-relaxed">
                  {selectedProvider === 'ollama' ? (
                    <span className="block px-4">
                      אין מודלים מקומיים זמינים.
                      <br />
                      ודא שהרצת <code className="bg-muted px-1 py-0.5 font-mono">ollama run &lt;model-name&gt;</code> במחשב שלך.
                    </span>
                  ) : (
                    'אין מודלים זמינים'
                  )}
                </div>
              ) : (
                <>
                  {/* Auto Mode Option */}
                  {selectedProvider !== 'ollama' && (
                    <button
                      type="button"
                      onClick={() => handleModelSelect('auto')}
                      className={cn(
                        'col-span-2 relative flex items-center justify-between p-3 border text-right transition-all cursor-pointer rounded-none outline-none select-none h-11 w-full',
                        selectedModel === 'auto'
                          ? 'border-border text-primary bg-primary/5 shadow-xs'
                          : 'border-border/40 hover:bg-muted/30 hover:border-foreground/30 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {selectedModel === 'auto' && (
                        <Check
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary z-10"
                          weight="bold"
                        />
                      )}
                      <div className="flex items-center gap-2 z-10">
                        <Sparkle className={cn("h-3.5 w-3.5 text-primary", selectedModel === 'auto' && "animate-pulse")} weight="fill" />
                        <span className="text-xs font-black leading-tight">אוטומטי</span>
                      </div>
                    </button>
                  )}

                  {models.map((m) => {
                    const isSelected = selectedModel === m;
                    const isOllama = selectedProvider === 'ollama';
                    const isOllamaRunning = isOllama && (
                      runningOllamaModels?.includes(m) || 
                      runningOllamaModels?.some(r => r.startsWith(m + ':') || m.startsWith(r + ':'))
                    );
                    const isBusy = busyModel === m;

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleModelSelect(m)}
                        className={cn(
                          'relative flex flex-col items-start justify-between p-3 border text-right transition-all cursor-pointer rounded-none outline-none select-none h-[72px] w-full',
                          isSelected
                            ? 'border-border text-primary bg-primary/5 shadow-xs'
                            : 'border-border/40 hover:bg-muted/30 hover:border-foreground/30 text-muted-foreground hover:text-foreground',
                        )}
                        title={getFriendlyModelName(m)}
                      >
                        {isSelected && !isOllama && (
                          <Check
                            className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-primary z-10"
                            weight="bold"
                          />
                        )}

                        {/* Ollama Management Control */}
                        {isOllama && (
                          <div className="absolute left-2 top-2 z-20 flex items-center gap-1.5">
                            {isBusy ? (
                              <CircleNotch className="h-4 w-4 animate-spin text-primary" />
                            ) : isOllamaRunning ? (
                              <button
                                type="button"
                                onClick={(e) => handleStopOllamaModel(e, m)}
                                title="פרוק מהזיכרון"
                                className="h-6 w-6 rounded-none border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 hover:border-red-500/40 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Stop className="h-3.5 w-3.5" weight="fill" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleStartOllamaModel(e, m)}
                                title="טען לזיכרון"
                                className="h-6 w-6 rounded-none border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Play className="h-3 w-3" weight="fill" />
                              </button>
                            )}
                          </div>
                        )}

                        <span className="text-xs font-black leading-tight truncate w-[80%] z-10">
                          {getFriendlyModelName(m)}
                        </span>

                        {isOllama ? (
                          <div className="flex items-center gap-1.5 mt-1.5 z-10 text-[9px] font-bold">
                            <span className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              isOllamaRunning 
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse'
                                : 'bg-muted-foreground/40'
                            )} />
                            <span className={cn(
                              isOllamaRunning ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60'
                            )}>
                              {isOllamaRunning ? 'פעיל בזיכרון' : 'לא פעיל'}
                            </span>
                          </div>
                        ) : ModelTags[m] ? (
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
                </>
              )}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
