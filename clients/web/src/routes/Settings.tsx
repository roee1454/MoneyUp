import { useEffect, useState } from 'react';
import {
  CircleNotch,
  Plus,
  Browser,
  Clock,
  ArrowsClockwise,
  Warning,
  SparkleIcon,
} from '@phosphor-icons/react';
import { useAppStore } from '@/store';
import { useUserProfile, useUpdateScraperSettings } from '@/hooks/useUsers';
import { useAccounts } from '@/hooks/useAccounts';
import { PremiumCard } from '@/components/ui/premium-card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectItem } from '@/components/ui/select';
import { AddBankAccountDialog } from '@/components/AddBankAccountDialog';
import { AddAiProviderDialog } from '@/components/AddAiProviderDialog';
import { AccountStrip } from '@/components/AccountStrip';
import { AiProviderStrip } from '@/components/AiProviderStrip';
import { z } from 'zod';
import { toast } from 'sonner';

const scraperSettingsSchema = z.object({
  scraperTimeoutRetryCount: z.number().int().min(0).max(5),
  scraperLoginTimeoutSeconds: z.number().int().min(10).max(300),
  scraperDefaultTimeoutSeconds: z.number().int().min(10).max(300),
  cooldownValue: z.number().int().min(0),
  cooldownUnit: z.enum(['seconds', 'minutes', 'hours']),
  scraperShowBrowser: z.boolean(),
});

export default function Settings() {
  const session = useAppStore((s) => s.session);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts();
  const {
    data: userProfile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
  } = useUserProfile(session?.userId);

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
    }
  }, [userProfile]);

  if (isLoadingAccounts || isLoadingProfile) {
    return (
      <div
        className="h-[60vh] flex items-center justify-center text-center animate-in fade-in-50 duration-300"
        dir="rtl"
      >
        <div className="flex flex-col items-center gap-3">
          <CircleNotch className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">
            טוען הגדרות מערכת...
          </span>
        </div>
      </div>
    );
  }

  const handleSaveScraperSettings = () => {
    const result = scraperSettingsSchema.safeParse({
      scraperTimeoutRetryCount,
      scraperLoginTimeoutSeconds,
      scraperDefaultTimeoutSeconds,
      cooldownValue,
      cooldownUnit,
      scraperShowBrowser,
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
      },
      {
        onSuccess: () => {
          toast.success('הגדרות הסורק נשמרו בהצלחה');
        },
        onError: () => {
          toast.error('שגיאה בשמירת הגדרות הסורק');
        },
      },
    );
  };

  const activeProvider = userProfile?.activeAiProvider as
    | 'openai'
    | 'claude'
    | 'gemini'
    | undefined;
  const configuredProviders = (userProfile?.configuredProviders ?? []) as Array<
    'openai' | 'claude' | 'gemini'
  >;

  return (
    <div
      className="max-w-6xl mx-auto space-y-8 text-right animate-in fade-in-50 duration-500"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            הגדרות מערכת
          </h1>
          <p className="text-base font-medium text-muted-foreground leading-relaxed max-w-2xl">
            נהל את כל היבטי המערכת שלך במקום אחד: מחיבורי הבנקים והאשראי, דרך
            הגדרות ה-AI ועד לקונפיגורציה מתקדמת של הסורקים האוטומטיים.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            מחובר כ-{userProfile?.username}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Settings Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Bank Connections Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-none bg-primary flex items-center justify-center">
                  <Plus
                    className="h-4 w-4 text-primary-foreground"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-black text-foreground">
                  מקורות מידע פיננסי
                </h2>
              </div>
              <Button
                onClick={() => setIsBankDialogOpen(true)}
                className="h-9 px-4 text-xs font-black bg-primary hover:bg-primary/90 text-primary-foreground rounded-none shadow-lg shadow-primary/10 transition-all active:scale-95"
              >
                <span>הוספת חשבון / כרטיס</span>
              </Button>
            </div>

            <PremiumCard className="p-0 overflow-hidden border-border/60">
              <AccountStrip
                accounts={accounts}
                onAddClick={() => setIsBankDialogOpen(true)}
                isInitialLoading={isLoadingAccounts}
              />
            </PremiumCard>
          </section>

          {/* AI Providers Section */}
          <section className="space-y-4">
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
                onClick={() => setIsAiDialogOpen(true)}
                variant="outline"
                className="h-9 px-4 text-xs font-black border-border hover:bg-accent rounded-none transition-all"
              >
                <span>הוספת ספק (API)</span>
              </Button>
            </div>

            <div className="grid gap-4">
              {configuredProviders.length > 0 ? (
                <AiProviderStrip
                  configuredProviders={configuredProviders}
                  activeProvider={activeProvider || null}
                  configs={userProfile?.aiProviderConfigs || null}
                />
              ) : (
                <div className="col-span-full border border-dashed border-border bg-muted/20 p-8 flex flex-col items-center justify-center text-center space-y-3">
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
                    onClick={() => setIsAiDialogOpen(true)}
                    className="h-9 px-6 text-xs font-black bg-primary text-primary-foreground rounded-none mt-2"
                  >
                    התחבר עכשיו
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Advanced Scraper Settings Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-none bg-primary flex items-center justify-center">
              <ArrowsClockwise
                className="h-4 w-4 text-primary-foreground"
                weight="bold"
              />
            </div>
            <h2 className="text-xl font-black text-foreground">
              הגדרות סורקים
            </h2>
          </div>

          <PremiumCard className="p-6 space-y-6 border-border/60 relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-1.5 h-full bg-primary opacity-10 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="space-y-6">
              {/* Show Browser */}
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

              <div className="h-px bg-border w-full" />

              {/* Retries */}
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

              {/* Timeouts */}
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

              {/* Cooldown */}
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

          {/* Help/Support Section */}
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
                  הגדרות אלו משפיעות ישירות על יציבות הסנכרון מול הבנקים. במקרה
                  של תקלות חוזרות, מומלץ להעלות את זמני ה-Timeout או להפעיל את
                  תצוגת הדפדפן כדי לאבחן את הבעיה.
                </p>
              </div>
            </div>
          </PremiumCard>
        </div>
      </div>

      {/* Dialog Containers */}
      <AddBankAccountDialog
        open={isBankDialogOpen}
        onOpenChange={setIsBankDialogOpen}
        onSuccess={() => {}}
      />
      <AddAiProviderDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        onSuccess={refetchProfile}
      />
    </div>
  );
}
