import { DownloadSimple, MagnifyingGlass, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InstallBrowserCardProps {
  availableBrowsers: any[];
  isInstalling: boolean;
  onInstall: () => void;
  onDetect: () => void;
}

export function InstallBrowserCard({
  availableBrowsers,
  isInstalling,
  onInstall,
  onDetect,
}: InstallBrowserCardProps) {
  return (
    <div className="border border-dashed border-border bg-muted/20 p-8 flex flex-col items-center justify-center text-center space-y-3 rounded-none">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <Warning className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-black text-foreground">
          לא הוגדר דפדפן לסריקה אוטומטית
        </p>
        <p className="text-xs font-medium text-muted-foreground leading-relaxed max-w-xs">
          כדי לאפשר סנכרון אוטומטי מול הבנקים, מומלץ להתקין את רכיב הדפדפן
          הפנימי (Chromium).
        </p>
      </div>

      {availableBrowsers.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-[10px] font-black text-muted-foreground uppercase text-right">
            דפדפנים שזוהו במערכת:
          </p>
          <div className="space-y-1.5">
            {availableBrowsers.map((b, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-muted/20 border border-border text-[10px]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      b.installed ? 'bg-emerald-500' : 'bg-zinc-400',
                    )}
                  />
                  <span className="font-bold text-foreground">
                    {b.name}@{b.version}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {b.installed ? 'מותקן' : 'לא מותקן'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 w-full">
        <Button
          onClick={onInstall}
          disabled={isInstalling}
          className="h-9 px-6 text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-none w-full shadow-xl shadow-primary/10"
        >
          <DownloadSimple weight="bold" className="ml-2 h-4 w-4" />
          <span>התקן Chromium באופן אוטומטי</span>
        </Button>
        <Button
          onClick={onDetect}
          variant="outline"
          className="h-9 px-6 text-xs font-black border-border hover:bg-accent rounded-none w-full"
        >
          <MagnifyingGlass weight="bold" className="ml-2 h-4 w-4" />
          <span>חפש דפדפנים מותקנים שוב</span>
        </Button>
      </div>
    </div>
  );
}
