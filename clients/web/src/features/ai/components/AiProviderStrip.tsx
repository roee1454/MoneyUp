import { useState } from 'react';
import { AiIcon, type AiProvider } from './AiIcon';
import { Button } from '@/components/ui/button';
import { Gear, Trash } from '@phosphor-icons/react';
import { AiProviderConfigDialog } from './AiProviderConfigDialog';
import { useDeleteAiProvider } from '@/hooks/useAi';

interface AiProviderStripProps {
  configuredProviders: AiProvider[];
  activeProvider: AiProvider | null;
  configs: Record<string, any> | null;
}

export function AiProviderStrip({
  configuredProviders,
  activeProvider,
  configs,
}: AiProviderStripProps) {
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(
    null,
  );
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
        const presetLabel =
          {
            accurate: 'מדויק',
            moderate: 'מאוזן',
            save_tokens: 'חסכוני',
            custom: 'מותאם אישית',
          }[config?.preset as string] || 'ברירת מחדל';

        return (
          <div
            key={provider}
            className="h-16 w-full border border-border bg-card hover:bg-accent px-3 py-2 rounded-none flex items-center justify-between transition-all group select-none text-right"
          >
            <div className="flex items-center gap-2">
              <AiIcon provider={provider} size="sm" />
              <div className="text-right leading-tight">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {provider.toUpperCase()}
                  </p>
                  {isActive && (
                    <span className="px-1 py-0.5 bg-emerald-500/10 text-emerald-600 text-[8px] font-black rounded-none uppercase">
                      פעיל
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground">
                  {modelName} • {presetLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-none text-muted-foreground hover:text-foreground hover:bg-background/50"
                onClick={() => setEditingProvider(provider)}
              >
                <Gear className="h-4 w-4" weight="bold" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-none text-muted-foreground/60 hover:text-rose-600 hover:bg-rose-500/5"
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
