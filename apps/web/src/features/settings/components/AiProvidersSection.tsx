import { SparkleIcon, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { AiProviderStrip } from '@/features/ai/components/AiProviderStrip';
import type { User } from '@/hooks/useUsers';
import type { AiProvider } from '@/features/ai/components/AiIcon';

interface AiProvidersSectionProps {
  userProfile: User | null | undefined;
  onAddClick: () => void;
}

export function AiProvidersSection({
  userProfile,
  onAddClick,
}: AiProvidersSectionProps) {
  const configuredProviders = (userProfile?.configuredProviders ?? []) as Array<
    AiProvider
  >;

  return (
    <section className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-none bg-primary flex items-center justify-center">
            <SparkleIcon
              className="h-4 w-4 text-primary-foreground"
              weight="bold"
            />
          </div>
          <h2 className="text-xl font-black text-foreground">
            ספקי בינה מלאכותית
          </h2>
        </div>
        <Button
          onClick={onAddClick}
          className="h-9 px-4 text-xs font-black bg-primary hover:bg-primary/90 text-primary-foreground rounded-none shadow-lg shadow-primary/10 transition-all active:scale-95"
        >
          <span>הוספת ספק (API)</span>
        </Button>
      </div>

      {configuredProviders.length > 0 ? (
        <AiProviderStrip
          configuredProviders={configuredProviders}
          configs={userProfile?.aiProviderConfigs || null}
        />
      ) : (
        <div className="border border-dashed border-border bg-muted/20 p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Warning className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-foreground">
              לא הוגדרו ספקי AI
            </p>
            <p className="text-xs font-medium text-muted-foreground max-w-xs">
              חבר ספק בינה מלאכותית כדי להתחיל לנתח את ההוצאות שלך ולקבל
              תובנות פיננסיות חכמות.
            </p>
          </div>
          <Button
            onClick={onAddClick}
            className="h-9 px-6 text-xs font-black bg-primary text-primary-foreground rounded-none mt-2"
          >
            התחבר עכשיו
          </Button>
        </div>
      )}
    </section>
  );
}
