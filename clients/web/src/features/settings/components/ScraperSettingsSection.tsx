import { useState, useEffect } from 'react';
import {
  ArrowsClockwise,
  Browser,
  CircleNotch,
  Clock,
  DownloadSimple,
  MagnifyingGlass,
  Warning,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { z } from 'zod';
import { PremiumCard } from '@/components/ui/premium-card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDetectChromium } from '@/hooks/useScrapers';
import { useUpdateScraperSettings } from '@/hooks/useUsers';
import type { User } from '@/hooks/useUsers';

const scraperSettingsSchema = z.object({
  scraperTimeoutRetryCount: z.number().int().min(0).max(5),
  scraperLoginTimeoutSeconds: z.number().int().min(10).max(300),
  scraperDefaultTimeoutSeconds: z.number().int().min(10).max(300),
  cooldownValue: z.number().int().min(0),
  cooldownUnit: z.enum(['seconds', 'minutes', 'hours']),
  scraperShowBrowser: z.boolean(),
  scraperChromiumPath: z.string().optional(),
});

interface ScraperSettingsSectionProps {
  userProfile: User | null | undefined;
}

export function ScraperSettingsSection({
  userProfile,
}: ScraperSettingsSectionProps) {
  const [scraperTimeoutRetryCount, setScraperTimeoutRetryCount] = useState(1);
  const [scraperLoginTimeoutSeconds, setScraperLoginTimeoutSeconds] =
    useState(90);
  const [scraperDefaultTimeoutSeconds, setScraperDefaultTimeoutSeconds] =
    useState(90);
  const [cooldownValue, setCooldownValue] = useState(30);
  const [cooldownUnit, setCooldownUnit] = useState<
    'seconds' | 'minutes' | 'hours'
  >('minutes');
  const [scraperShowBrowser, setScraperShowBrowser] = useState(false);
  const [scraperChromiumPath, setScraperChromiumPath] = useState('');
  const [showAdvancedScraper, setShowAdvancedScraper] = useState(false);

  const [isDetecting, setIsDetecting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [availableBrowsers, setAvailableBrowsers] = useState<any[]>([]);

  const { refetch: detectChromium } = useDetectChromium();
  const saveScraperSettings = useUpdateScraperSettings();

  useEffect(() => {
    if (userProfile) {
      setScraperTimeoutRetryCount(userProfile.scraperTimeoutRetryCount ?? 1);
      setScraperLoginTimeoutSeconds(
        userProfile.scraperLoginTimeoutSeconds ?? 90,
      );
      setScraperDefaultTimeoutSeconds(
        userProfile.scraperDefaultTimeoutSeconds ?? 90,
      );
      setScraperShowBrowser(userProfile.scraperShowBrowser ?? false);
      setScraperChromiumPath(userProfile.scraperChromiumPath ?? '');

      const totalSeconds = userProfile.scraperAutoSyncCooldownSeconds ?? 1800;
      if (totalSeconds % 3600 === 0 && totalSeconds > 0) {
        setCooldownValue(totalSeconds / 3600);
        setCooldownUnit('hours');
      } else if (totalSeconds % 60 === 0 && totalSeconds > 0) {
        setCooldownValue(totalSeconds / 60);
        setCooldownUnit('minutes');
      } else {
        setCooldownValue(totalSeconds);
        setCooldownUnit('seconds');
      }

      if (!userProfile.scraperChromiumPath && !isDetecting) {
        void handleAutoDetectChromium();
      }
    }
  }, [userProfile]);

  const handleAutoDetectChromium = async () => {
    setIsDetecting(true);
    setScraperChromiumPath('');
    try {
      const result = await detectChromium();
      if (result.data?.availableBrowsers)
        setAvailableBrowsers(result.data.availableBrowsers);
      const detectedPath =
        result.data?.success && result.data.path ? result.data.path : null;
      setScraperChromiumPath(detectedPath ?? '');

      saveScraperSettings.mutate({
        scraperTimeoutRetryCount: userProfile?.scraperTimeoutRetryCount ?? 1,
        scraperAutoSyncCooldownSeconds:
          userProfile?.scraperAutoSyncCooldownSeconds ?? 1800,
        scraperShowBrowser: userProfile?.scraperShowBrowser ?? false,
        scraperLoginTimeoutSeconds:
          userProfile?.scraperLoginTimeoutSeconds ?? 90,
        scraperDefaultTimeoutSeconds:
          userProfile?.scraperDefaultTimeoutSeconds ?? 90,
        scraperChromiumPath: detectedPath,
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleInstallChromium = () => {
    setIsInstalling(true);
    setInstallProgress(0);
    setInstallLogs([]);

    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/scrapers/install/stream`,
      { withCredentials: true },
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        setInstallLogs((prev) => [...prev.slice(-9), data.message]);
      } else if (data.type === 'progress') {
        setInstallProgress(data.progress);
      } else if (data.type === 'done') {
        toast.success('ההתקנה הושלמה בהצלחה');
        eventSource.close();
        setIsInstalling(false);
        void handleAutoDetectChromium();
      } else if (data.type === 'error') {
        toast.error(`ההתקנה נכשלה: ${data.error}`);
        eventSource.close();
        setIsInstalling(false);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      toast.error('אירעה שגיאה בתקשורת עם השרת');
      eventSource.close();
      setIsInstalling(false);
    };
  };

  const handleSaveScraperSettings = () => {
    const result = scraperSettingsSchema.safeParse({
      scraperTimeoutRetryCount,
      scraperLoginTimeoutSeconds,
      scraperDefaultTimeoutSeconds,
      cooldownValue,
      cooldownUnit,
      scraperShowBrowser,
      scraperChromiumPath,
    });

    if (!result.success) {
      toast.error('נא לבדוק את תקינות הערכים שהוזנו');
      return;
    }

    let scraperAutoSyncCooldownSeconds = cooldownValue;
    if (cooldownUnit === 'minutes') scraperAutoSyncCooldownSeconds *= 60;
    if (cooldownUnit === 'hours') scraperAutoSyncCooldownSeconds *= 3600;

    saveScraperSettings.mutate(
      {
        scraperTimeoutRetryCount,
        scraperLoginTimeoutSeconds,
        scraperDefaultTimeoutSeconds,
        scraperAutoSyncCooldownSeconds,
        scraperShowBrowser,
        scraperChromiumPath,
      },
      {
        onSuccess: () => toast.success('הגדרות הסורק נשמרו בהצלחה'),
        onError: () => toast.error('שגיאה בשמירת הגדרות הסורק'),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-none bg-primary flex items-center justify-center">
          <ArrowsClockwise
            className="h-4 w-4 text-primary-foreground"
            weight="bold"
          />
        </div>
        <h2 className="text-xl font-black text-foreground">הגדרות סורקים</h2>
      </div>

      {isDetecting ? (
        <PremiumCard className="p-12 flex flex-col items-center justify-center text-center space-y-4 border-border/60">
          <CircleNotch className="h-10 w-10 animate-spin text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-black text-foreground">
              מחפש דפדפן תואם במערכת...
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              פעולה זו מתבצעת באופן אוטומטי לצורך הגדרת הסורקים
            </p>
          </div>
        </PremiumCard>
      ) : isInstalling ? (
        <PremiumCard className="p-8 flex flex-col space-y-6 border-border/30 bg-primary/5 relative overflow-hidden">
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
                {installProgress}%
              </span>
            </div>
            <div className="h-2 w-full bg-primary/10 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${installProgress}%` }}
              />
            </div>
          </div>
          <div className="bg-zinc-950 p-4 font-mono text-[10px] text-zinc-300 space-y-1 h-32 overflow-y-auto border border-white/5">
            {installLogs.length === 0 ? (
              <p className="text-zinc-600 italic">ממתין לתחילת התהליך...</p>
            ) : (
              installLogs.map((log, i) => (
                <p key={i} className="break-all opacity-80">
                  <span className="text-primary mr-2">›</span>
                  {log}
                </p>
              ))
            )}
          </div>
        </PremiumCard>
      ) : !userProfile?.scraperChromiumPath ? (
        <div className="space-y-4">
          <PremiumCard className="p-8 flex flex-col items-center justify-center text-center space-y-5 border-destructive/30 bg-destructive/5">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <Warning className="h-8 w-8 text-destructive" weight="fill" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-black text-foreground">
                לא הוגדר דפדפן לסריקה אוטומטית
              </p>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
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
                onClick={handleInstallChromium}
                disabled={isInstalling}
                className="h-11 px-6 text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-none w-full shadow-xl shadow-primary/10"
              >
                <DownloadSimple weight="bold" className="ml-2 h-4 w-4" />
                <span>התקן Chromium באופן אוטומטי</span>
              </Button>
              <Button
                onClick={handleAutoDetectChromium}
                variant="outline"
                className="h-11 px-6 text-xs font-black border-border hover:bg-accent rounded-none w-full"
              >
                <MagnifyingGlass weight="bold" className="ml-2 h-4 w-4" />
                <span>חפש דפדפנים מותקנים שוב</span>
              </Button>
            </div>
          </PremiumCard>
        </div>
      ) : (
        <PremiumCard className="p-6 space-y-6 border-border/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-primary opacity-10 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="space-y-6">
            <div className="flex items-center justify-between group/item">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Browser className="h-4 w-4 text-emerald-500" />
                  <label className="text-sm font-black text-foreground">
                    הדפדפן מוגדר ומוכן
                  </label>
                </div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  הסורק האוטומטי מוכן לפעולה
                </p>
              </div>
              <button
                onClick={() => setShowAdvancedScraper(!showAdvancedScraper)}
                className="text-[10px] font-black text-muted-foreground hover:text-primary transition-colors"
              >
                {showAdvancedScraper ? 'הסתר הגדרות' : 'הגדרות מתקדמות'}
              </button>
            </div>
            {showAdvancedScraper && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="h-px bg-border w-full" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Browser className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-black text-foreground">
                        נתיב דפדפן (Chromium)
                      </label>
                    </div>
                    <button
                      onClick={handleAutoDetectChromium}
                      className="text-[10px] font-black text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MagnifyingGlass weight="bold" className="h-3 w-3" />
                      <span>סריקה מחדש</span>
                    </button>
                  </div>
                  <div
                    onClick={() => {
                      const path = window.prompt(
                        'עדכן את נתיב הדפדפן:',
                        scraperChromiumPath,
                      );
                      if (path) setScraperChromiumPath(path);
                    }}
                    className="p-2.5 bg-muted/30 border border-border text-[10px] font-mono font-bold text-muted-foreground truncate cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {scraperChromiumPath}
                  </div>
                </div>
                <div className="flex items-center justify-between group/item">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Browser className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-black text-foreground">
                        הצגת דפדפן
                      </label>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      הצגת תהליך הסריקה בחלון נפרד
                    </p>
                  </div>
                  <Switch
                    checked={scraperShowBrowser}
                    onCheckedChange={setScraperShowBrowser}
                  />
                </div>
              </div>
            )}
            <div className="h-px bg-border w-full" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowsClockwise className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-black text-foreground">
                  ניסיונות סריקה חוזרים
                </label>
              </div>
              <Select
                value={String(scraperTimeoutRetryCount)}
                onValueChange={(val) =>
                  setScraperTimeoutRetryCount(Number(val))
                }
              >
                <SelectItem value="0">ללא ניסיונות חוזרים</SelectItem>
                <SelectItem value="1">ניסיון אחד נוסף</SelectItem>
                <SelectItem value="2">2 ניסיונות נוספים</SelectItem>
                <SelectItem value="3">3 ניסיונות נוספים</SelectItem>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <label className="text-[11px] font-black text-foreground leading-tight">
                    זמן התחברות (שניות)
                  </label>
                </div>
                <input
                  type="number"
                  value={scraperLoginTimeoutSeconds}
                  onChange={(e) =>
                    setScraperLoginTimeoutSeconds(Number(e.target.value))
                  }
                  className="h-10 w-full border border-border bg-muted/30 px-3 text-xs font-bold focus:bg-card focus:outline-none transition-all rounded-none text-foreground"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <label className="text-[11px] font-black text-foreground leading-tight">
                    זמן סריקה (שניות)
                  </label>
                </div>
                <input
                  type="number"
                  value={scraperDefaultTimeoutSeconds}
                  onChange={(e) =>
                    setScraperDefaultTimeoutSeconds(Number(e.target.value))
                  }
                  className="h-10 w-full border border-border bg-muted/30 px-3 text-xs font-bold focus:bg-card focus:outline-none transition-all rounded-none text-foreground"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowsClockwise className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-black text-foreground">
                  זמן המתנה בין סנכרונים
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={cooldownValue}
                  onChange={(e) => setCooldownValue(Number(e.target.value))}
                  className="h-10 w-24 border border-border bg-muted/30 px-3 text-xs font-bold focus:bg-card focus:outline-none transition-all rounded-none text-foreground"
                />
                <Select
                  value={cooldownUnit}
                  onValueChange={(val: any) => setCooldownUnit(val)}
                  className="flex-1"
                >
                  <SelectItem value="seconds">שניות</SelectItem>
                  <SelectItem value="minutes">דקות</SelectItem>
                  <SelectItem value="hours">שעות</SelectItem>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleSaveScraperSettings}
              disabled={saveScraperSettings.isPending}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-none font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/10"
            >
              {saveScraperSettings.isPending ? (
                <CircleNotch className="h-4 w-4 animate-spin" />
              ) : (
                <span>שמירת כל ההגדרות</span>
              )}
            </Button>
          </div>
        </PremiumCard>
      )}

      <PremiumCard className="p-5 bg-muted/10 border-dashed border-border">
        <div className="flex gap-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center">
            <Warning className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-foreground leading-tight">
              צריך עזרה?
            </h4>
            <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
              הגדרות אלו משפיעות ישירות על יציבות הסנכרון מול הבנקים. במקרה של
              תקלות חוזרות, מומלץ להעלות את זמני ה-Timeout או להפעיל את תצוגת
              הדפדפן כדי לאבחן את הבעיה.
            </p>
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}
