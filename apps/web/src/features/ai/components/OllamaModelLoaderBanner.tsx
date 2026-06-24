import { WarningIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { PremiumButton } from '@/components/ui/premium-button';

interface OllamaModelLoaderBannerProps {
  selectedModel: string;
  isModelLoaded: boolean;
  isStartingModel: boolean;
  onStartModel?: () => void;
}

export function OllamaModelLoaderBanner({
  selectedModel,
  isModelLoaded,
  isStartingModel,
  onStartModel,
}: OllamaModelLoaderBannerProps) {
  if (isModelLoaded || !selectedModel) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-muted/40 border-b border-border/40 text-right dir-rtl animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-none bg-primary/10 text-primary border border-border/30 shrink-0">
          <WarningIcon className={"h-4.5 w-4.5"} />
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-foreground">מודל Ollama לא פעיל בזיכרון</div>
          <div className="text-xs text-muted-foreground">
            המודל "{selectedModel}" חייב להיות טעון ב-VRAM/RAM על מנת להתחיל בשיחה.
          </div>
        </div>
      </div>
      <PremiumButton
        type="button"
        variant="default"
        size="sm"
        onClick={onStartModel}
        disabled={isStartingModel}
        className="w-full sm:w-auto shrink-0"
      >
        {isStartingModel ? (
          <>
            <CircleNotchIcon className="h-3.5 w-3.5 animate-spin ml-1.5" />
            <span>טוען לזיכרון...</span>
          </>
        ) : (
          <span>טען מודל לזיכרון</span>
        )}
      </PremiumButton>
    </div>
  );
}
