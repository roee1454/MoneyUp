import { useState } from 'react';
import { AiIcon, type AiProvider } from '@/components/AiIcon';
import { Button } from '@/components/ui/button';
import { Gear, Trash } from '@phosphor-icons/react';
import { AiProviderConfigDialog } from './AiProviderConfigDialog';
import { useDeleteAiProvider } from '@/hooks/useAi';
import { cn } from '@/lib/utils';

interface AiProviderStripProps {
  configuredProviders: AiProvider[];
  activeProvider: AiProvider | null;
  configs: Record<string, any> | null;
}

export function AiProviderStrip({ configuredProviders, activeProvider, configs }: AiProviderStripProps) {
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const deleteAiProvider = useDeleteAiProvider();

  if (configuredProviders.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {configuredProviders.map((provider) => {
        const isActive = activeProvider === provider;
        const config = configs?.[provider];
        const modelName = config?.model || 'לא הוגדר מודל';
        const presetLabel = {
          accurate: 'מדויק',
          moderate: 'מאוזן',
          save_tokens: 'חסכוני',
          custom: 'מותאם אישית',
        }[config?.preset as string] || 'ברירת מחדל';

        return (
          <div
            key={provider}
            className={cn(
              "h-16 w-full border bg-white dark:bg-zinc-950 px-3 py-2 rounded-none flex items-center justify-between transition-all group select-none",
              isActive ? "border-indigo-500/50 shadow-sm" : "border-zinc-200 dark:border-zinc-800"
            )}
          >
            <div className="flex items-center gap-3">
              <AiIcon provider={provider} size="sm" />
              <div className="text-right leading-tight">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {provider.toUpperCase()}
                  </p>
                  {isActive && (
                    <span className="px-1 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black rounded-none uppercase">
                      פעיל
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-500">
                  {modelName} • {presetLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-none text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
                onClick={() => setEditingProvider(provider)}
              >
                <Gear className="h-4 w-4" weight="bold" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-none text-zinc-400 hover:text-rose-600"
                onClick={() => deleteAiProvider.mutate({ provider })}
              >
                <Trash className="h-4 w-4" weight="bold" />
              </Button>
            </div>
          </div>
        );
      })}

      {editingProvider && (
        <AiProviderConfigDialog
          provider={editingProvider}
          open={!!editingProvider}
          onOpenChange={(open) => !open && setEditingProvider(null)}
          currentConfig={configs?.[editingProvider]}
        />
      )}
    </div>
  );
}
