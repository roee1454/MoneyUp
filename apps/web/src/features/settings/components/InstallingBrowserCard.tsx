import { CircleNotch } from '@phosphor-icons/react';

interface InstallingBrowserCardProps {
  progress: number;
  logs: string[];
}

export function InstallingBrowserCard({
  progress,
  logs,
}: InstallingBrowserCardProps) {
  return (
    <div className="border border-border p-8 flex flex-col space-y-6 bg-primary/5 relative overflow-hidden rounded-none">
      <div className="flex flex-col items-center text-center space-y-4">
        <CircleNotch className="h-10 w-10 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-black text-foreground">
            מתקין Chromium במערכת...
          </p>
          <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
            פעולה זו עשויה לקחת מספר דקות, אנא אל תסגור את הדף.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-black text-primary uppercase">
            התקדמות ההורדה
          </span>
          <span className="text-xs font-mono font-bold text-primary">
            {progress}%
          </span>
        </div>
        <div className="h-2 w-full bg-primary/10 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="bg-zinc-950 p-4 font-mono text-[10px] text-zinc-300 space-y-1 h-32 overflow-y-auto border border-white/5">
        {logs.length === 0 ? (
          <p className="text-zinc-600 italic">ממתין לתחילת התהליך...</p>
        ) : (
          logs.map((log, i) => (
            <p key={i} className="break-all opacity-80">
              <span className="text-primary mr-2">›</span>
              {log}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
