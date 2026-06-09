import { Browser, CaretDown, CircleNotch, MagnifyingGlass } from '@phosphor-icons/react';
import { PremiumCard } from '@/components/ui/premium-card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { HelpTooltip } from './HelpTooltip';

interface ScraperSettingsCardProps {
  scraperChromiumPath: string;
  scraperShowBrowser: boolean;
  setScraperShowBrowser: (show: boolean) => void;
  showAdvancedScraper: boolean;
  setShowAdvancedScraper: (show: boolean) => void;
  scraperTimeoutRetryCount: number;
  setScraperTimeoutRetryCount: (val: number) => void;
  cooldownValue: number;
  setCooldownValue: (val: number) => void;
  cooldownUnit: 'seconds' | 'minutes' | 'hours';
  setCooldownUnit: (val: 'seconds' | 'minutes' | 'hours') => void;
  scraperLoginTimeoutSeconds: number;
  setScraperLoginTimeoutSeconds: (val: number) => void;
  scraperDefaultTimeoutSeconds: number;
  setScraperDefaultTimeoutSeconds: (val: number) => void;
  isDetecting: boolean;
  onDetect: () => void;
  onSaveAll: () => void;
  isPending: boolean;
  onOpenPathDialog: () => void;
}

export function ScraperSettingsCard({
  scraperChromiumPath,
  scraperShowBrowser,
  setScraperShowBrowser,
  showAdvancedScraper,
  setShowAdvancedScraper,
  scraperTimeoutRetryCount,
  setScraperTimeoutRetryCount,
  cooldownValue,
  setCooldownValue,
  cooldownUnit,
  setCooldownUnit,
  scraperLoginTimeoutSeconds,
  setScraperLoginTimeoutSeconds,
  scraperDefaultTimeoutSeconds,
  setScraperDefaultTimeoutSeconds,
  isDetecting,
  onDetect,
  onSaveAll,
  isPending,
  onOpenPathDialog,
}: ScraperSettingsCardProps) {
  return (
    <PremiumCard className="space-y-5">
      <div className="space-y-5">
        {/* Main Settings */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Browser className="h-4.5 w-4.5 text-primary" />
                <span className="text-sm font-black text-foreground">נתיב דפדפן (Chromium)</span>
              </div>
              <button
                onClick={onDetect}
                disabled={isDetecting}
                className="text-[11px] font-black text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="סריקת דפדפן מחדש"
              >
                <MagnifyingGlass weight="bold" className="h-3.5 w-3.5" />
                <span>סרוק מחדש</span>
              </button>
            </div>
            
            <div
              onClick={onOpenPathDialog}
              className="p-3 bg-muted/40 border border-border text-[10.5px] font-mono font-bold text-muted-foreground truncate cursor-pointer hover:bg-muted/60 hover:border-border transition-all mt-1"
            >
              {scraperChromiumPath || 'לא נמצא נתיב דפדפן'}
            </div>
          </div>

          <div className="h-px bg-border/40 w-full" />

          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-foreground">הצגת דפדפן</span>
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground">
                הצגת תהליך הסריקה בחלון נפרד (שימושי לצורך פתרון בעיות)
              </p>
            </div>
            <Switch
              checked={scraperShowBrowser}
              onCheckedChange={setScraperShowBrowser}
            />
          </div>
        </div>

        <div className="h-px bg-border/40 w-full" />

        {/* Collapse Trigger */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowAdvancedScraper(!showAdvancedScraper)}
            className="text-xs font-black text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer py-1"
          >
            <span>{showAdvancedScraper ? 'הסתר הגדרות מתקדמות' : 'הצג הגדרות מתקדמות'}</span>
            <CaretDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showAdvancedScraper && "rotate-180")} weight="bold" />
          </button>
        </div>

        {/* Advanced Settings collapsible */}
        {showAdvancedScraper && (
          <div className="p-4 bg-muted/15 border border-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 rounded-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              
              {/* Scrape Retries */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-foreground">ניסיונות סריקה חוזרים</span>
                  <HelpTooltip content="מספר הניסיונות שהסורק יבצע במידה והסנכרון נכשל בשל בעיות תקשורת או שגיאה זמנית באתר הבנק." />
                </div>
                <Select
                  value={String(scraperTimeoutRetryCount)}
                  onValueChange={(val) =>
                    setScraperTimeoutRetryCount(Number(val))
                  }
                  className="h-10 text-xs font-bold px-3"
                >
                  <SelectItem value="0">ללא ניסיונות חוזרים</SelectItem>
                  <SelectItem value="1">ניסיון אחד נוסף</SelectItem>
                  <SelectItem value="2">2 ניסיונות נוספים</SelectItem>
                  <SelectItem value="3">3 ניסיונות נוספים</SelectItem>
                </Select>
              </div>

              {/* Cooldown time between syncs */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-foreground">המתנה בין סנכרונים</span>
                  <HelpTooltip content="תקופת הצינון הנדרשת בין סנכרונים ידניים עוקבים כדי למנוע חסימת החשבון ע'י מערכות האבטחה של הבנק." />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={cooldownValue}
                    onChange={(e) => setCooldownValue(Number(e.target.value))}
                    className="h-10 w-24 border border-border bg-muted/30 px-3 text-xs font-bold focus:bg-card focus:outline-none transition-all rounded-none text-foreground text-center shrink-0"
                  />
                  <Select
                    value={cooldownUnit}
                    onValueChange={(val: any) => setCooldownUnit(val)}
                    className="h-10 text-xs font-bold px-3 flex-1"
                  >
                    <SelectItem value="seconds">שניות</SelectItem>
                    <SelectItem value="minutes">דקות</SelectItem>
                    <SelectItem value="hours">שעות</SelectItem>
                  </Select>
                </div>
              </div>

              {/* Connection Timeout */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-foreground">זמן התחברות (שניות)</span>
                  <HelpTooltip content="הזמן המקסימלי (בשניות) שהמערכת תמתין לטעינת דף ההתחברות של הבנק או כרטיס האשראי." />
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

              {/* Default/Scrape Timeout */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-foreground">זמן סריקה (שניות)</span>
                  <HelpTooltip content="הזמן המקסימלי (בשניות) שהמערכת תמתין לטעינת נתוני העובר ושב או העסקאות בתוך החשבון." />
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
          </div>
        )}

        <div className="h-px bg-border/40 w-full" />

        <Button
          onClick={onSaveAll}
          disabled={isPending}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-none font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/10"
        >
          {isPending ? (
            <CircleNotch className="h-4 w-4 animate-spin" />
          ) : (
            <span>שמירת כל ההגדרות</span>
          )}
        </Button>
      </div>
    </PremiumCard>
  );
}
