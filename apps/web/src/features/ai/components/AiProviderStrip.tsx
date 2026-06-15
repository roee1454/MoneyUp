import { useState } from 'react';
import { AiIcon, type AiProvider } from './AiIcon';
import { Button } from '@/components/ui/button';
import { Gear, Trash } from '@phosphor-icons/react';
import { AiProviderConfigDialog } from './AiProviderConfigDialog';
import { useDeleteAiProvider } from '@/hooks/useAi';
import { DeleteAiProviderConfirmDialog } from './DeleteAiProviderConfirmDialog';
import { PremiumMotionCard } from '@/components/ui/premium-motion-card';

interface AiProviderStripProps {
  configuredProviders: AiProvider[];
  configs: Record<string, any> | null;
}

export function AiProviderStrip({
  configuredProviders,
  configs,
}: AiProviderStripProps) {
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(
    null,
  );
  const [providerToDelete, setProviderToDelete] = useState<AiProvider | null>(
    null,
  );
  const deleteAiProvider = useDeleteAiProvider();

  if (configuredProviders.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {configuredProviders.map((provider) => {
        const config = configs?.[provider];
        const presetLabel =
          {
            accurate: 'מדויק',
            moderate: 'מאוזן',
            save_tokens: 'חסכוני',
            custom: 'מותאם אישית',
          }[config?.preset as string] || 'ברירת מחדל';

        return (
          <PremiumMotionCard
            key={provider}
            className="h-16 w-full px-5 py-2 flex items-center justify-between group select-none text-right"
          >
            <div className="flex items-center gap-2">
              <AiIcon provider={provider} size="sm" />
              <div className="text-right leading-tight">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {provider.toUpperCase()}
                  </p>
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground">
                 <span className='text-[10px] font-black text-muted-foreground'> פרופיל עבודה:</span> {presetLabel}
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
                onClick={() => setProviderToDelete(provider)}
              >
                <Trash className="h-4 w-4" weight="bold" />
              </Button>
            </div>
          </PremiumMotionCard>
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

      {/* Confirmation Delete AI Provider Dialog */}
      <DeleteAiProviderConfirmDialog
        open={!!providerToDelete}
        onOpenChange={(open) => !open && setProviderToDelete(null)}
        provider={providerToDelete}
        isPending={deleteAiProvider.isPending}
        onConfirm={async () => {
          if (!providerToDelete) return;
          try {
            await deleteAiProvider.mutateAsync({ provider: providerToDelete });
            setProviderToDelete(null);
          } catch (e) {
            // Handled by react-query mutation or toast
          }
        }}
      />
    </div>
  );
}
