import { useEffect } from 'react';
import { MagnifyingGlass, CaretDown } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDetectChromium } from '@/hooks/useScrapers';
import { useUpdateScraperSettings } from '@/hooks/useUsers';
import type { User } from '@/hooks/useUsers';
import { BrowserPathDialog } from './BrowserPathDialog';
import { InstallBrowserCard } from './InstallBrowserCard';
import { DetectingBrowserCard } from './DetectingBrowserCard';
import { InstallingBrowserCard } from './InstallingBrowserCard';
import { API_BASE } from '@/lib/api';
import { useSettingsStore } from '@/store/settingsStore';
import { PremiumButton } from '@/components/ui/premium-button';
import { PremiumInput } from '@/components/ui/premium-input';
import { Select, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const scraperSettingsSchema = z.object({
  scraperTimeoutRetryCount: z.number().int().min(0).max(5),
  scraperLoginTimeoutSeconds: z.number().int().min(10).max(300),
  scraperDefaultTimeoutSeconds: z.number().int().min(10).max(300),
  cooldownValue: z.number().int().min(0),
  cooldownUnit: z.enum(['seconds', 'minutes', 'hours']),
  scraperShowBrowser: z.boolean(),
  scraperChromiumPath: z.string().optional(),
});

type ScraperFormValues = z.infer<typeof scraperSettingsSchema>;

interface ScraperSettingsSectionProps {
  userProfile: User | null | undefined;
}

export function ScraperSettingsSection({
  userProfile,
}: ScraperSettingsSectionProps) {
  const {
    showAdvancedScraper,
    setShowAdvancedScraper,
    isPathDialogOpen,
    setIsPathDialogOpen,
    isDetecting,
    setIsDetecting,
    isInstalling,
    setIsInstalling,
    installProgress,
    setInstallProgress,
    installLogs,
    setInstallLogs,
    availableBrowsers,
    setAvailableBrowsers,
  } = useSettingsStore();

  const { refetch: detectChromium } = useDetectChromium();
  const saveScraperSettings = useUpdateScraperSettings();

  const { control, handleSubmit, reset, setValue, watch } = useForm<ScraperFormValues>({
    resolver: zodResolver(scraperSettingsSchema),
    defaultValues: {
      scraperTimeoutRetryCount: 1,
      scraperLoginTimeoutSeconds: 90,
      scraperDefaultTimeoutSeconds: 90,
      cooldownValue: 30,
      cooldownUnit: 'minutes',
      scraperShowBrowser: false,
      scraperChromiumPath: '',
    },
  });

  const scraperChromiumPath = watch('scraperChromiumPath') || '';

  useEffect(() => {
    if (userProfile) {
      const totalSeconds = userProfile.scraperAutoSyncCooldownSeconds ?? 1800;
      let val = 30;
      let unit: 'seconds' | 'minutes' | 'hours' = 'minutes';
      if (totalSeconds % 3600 === 0 && totalSeconds > 0) {
        val = totalSeconds / 3600;
        unit = 'hours';
      } else if (totalSeconds % 60 === 0 && totalSeconds > 0) {
        val = totalSeconds / 60;
        unit = 'minutes';
      } else {
        val = totalSeconds;
        unit = 'seconds';
      }

      reset({
        scraperTimeoutRetryCount: userProfile.scraperTimeoutRetryCount ?? 1,
        scraperLoginTimeoutSeconds: userProfile.scraperLoginTimeoutSeconds ?? 90,
        scraperDefaultTimeoutSeconds: userProfile.scraperDefaultTimeoutSeconds ?? 90,
        scraperShowBrowser: userProfile.scraperShowBrowser ?? false,
        scraperChromiumPath: userProfile.scraperChromiumPath ?? '',
        cooldownValue: val,
        cooldownUnit: unit,
      });

      if (!userProfile.scraperChromiumPath && !isDetecting) {
        void handleAutoDetectChromium();
      }
    }
  }, [userProfile, reset]);

  const handleAutoDetectChromium = async () => {
    setIsDetecting(true);
    setValue('scraperChromiumPath', '');
    try {
      const result = await detectChromium();
      if (result.data?.availableBrowsers)
        setAvailableBrowsers(result.data.availableBrowsers);
      const detectedPath =
        result.data?.success && result.data.path ? result.data.path : null;
      setValue('scraperChromiumPath', detectedPath ?? '');

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
      `${API_BASE}/scrapers/install/stream`,
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

  const onSubmitForm = (values: ScraperFormValues) => {
    let scraperAutoSyncCooldownSeconds = values.cooldownValue;
    if (values.cooldownUnit === 'minutes') scraperAutoSyncCooldownSeconds *= 60;
    if (values.cooldownUnit === 'hours') scraperAutoSyncCooldownSeconds *= 3600;

    saveScraperSettings.mutate(
      {
        scraperTimeoutRetryCount: values.scraperTimeoutRetryCount,
        scraperLoginTimeoutSeconds: values.scraperLoginTimeoutSeconds,
        scraperDefaultTimeoutSeconds: values.scraperDefaultTimeoutSeconds,
        scraperAutoSyncCooldownSeconds,
        scraperShowBrowser: values.scraperShowBrowser,
        scraperChromiumPath: values.scraperChromiumPath || null,
      },
      {
        onSuccess: () => toast.success('הגדרות הסורק נשמרו בהצלחה'),
        onError: () => toast.error('שגיאה בשמירת הגדרות הסורק'),
      },
    );
  };

  if (isDetecting) {
    return <DetectingBrowserCard />;
  }

  if (isInstalling) {
    return (
      <InstallingBrowserCard
        progress={installProgress}
        logs={installLogs}
      />
    );
  }

  if (!scraperChromiumPath) {
    return (
      <InstallBrowserCard
        availableBrowsers={availableBrowsers}
        isInstalling={isInstalling}
        onInstall={handleInstallChromium}
        onDetect={handleAutoDetectChromium}
      />
    );
  }

  return (
    <div className="w-full space-y-1 text-right">
      {/* Row 1: Chromium Browser Path */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-border/30 text-right items-start">
        <div className="space-y-1.5">
          <h3 className="font-black text-base text-foreground">נתיב דפדפן Chromium</h3>
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
            נתיב ההרצה של דפדפן Chromium המשמש להרצת הסורקים האוטומטיים.
          </p>
        </div>
        <div className="space-y-3 md:col-span-2 max-w-md w-full">
          <div
            onClick={() => setIsPathDialogOpen(true)}
            className="p-3 bg-muted/40 border border-border text-[10.5px] font-mono font-bold text-muted-foreground truncate cursor-pointer hover:bg-muted/60 hover:border-border transition-all w-full"
          >
            {scraperChromiumPath || 'לא נמצא נתיב דפדפן'}
          </div>
          <div className="flex justify-start">
            <PremiumButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoDetectChromium}
              disabled={isDetecting}
              className="text-xs"
            >
              <MagnifyingGlass weight="bold" className="h-3.5 w-3.5 ms-1.5" />
              <span>סריקה מחדש</span>
            </PremiumButton>
          </div>
        </div>
      </div>

      {/* Row 2: Show Browser */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-border/30 text-right items-start">
        <div className="space-y-1.5">
          <h3 className="font-black text-base text-foreground">הצגת דפדפן סריקה</h3>
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
            הצג את חלון הדפדפן באופן ויזואלי בזמן פעולת הסנכרון (שימושי לפתרון בעיות).
          </p>
        </div>
        <div className="md:col-span-2 max-w-md w-full flex items-center justify-between border border-border p-4 bg-muted/10">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-black text-foreground">מצב ויזואלי (Headful)</span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {watch('scraperShowBrowser') ? 'הדפדפן יוצג על המסך' : 'הדפדפן ירוץ ברקע'}
            </span>
          </div>
          <Controller
            name="scraperShowBrowser"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Switch
                checked={value}
                onCheckedChange={onChange}
              />
            )}
          />
        </div>
      </div>

      {/* Collapse/Expand Row for Advanced Settings */}
      <div className="py-6 flex justify-center w-full">
        <button
          type="button"
          onClick={() => setShowAdvancedScraper(!showAdvancedScraper)}
          className="text-xs font-black text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer py-1"
        >
          <span>{showAdvancedScraper ? 'הסתר הגדרות מתקדמות' : 'הצג הגדרות מתקדמות'}</span>
          <CaretDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showAdvancedScraper && "rotate-180")} weight="bold" />
        </button>
      </div>

      {/* Advanced Settings */}
      {showAdvancedScraper && (
        <>
          {/* Row 3: Scrape Retries */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-border/30 text-right items-start">
            <div className="space-y-1.5">
              <h3 className="font-black text-base text-foreground">ניסיונות סריקה חוזרים</h3>
              <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                מספר הניסיונות שהסורק יבצע במידה והסנכרון נכשל בשל בעיות תקשורת או שגיאה זמנית באתר הבנק.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2 max-w-md w-full">
              <Controller
                name="scraperTimeoutRetryCount"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Select
                    value={String(value)}
                    onValueChange={(val) => onChange(Number(val))}
                  >
                    <SelectItem value="0">ללא ניסיונות חוזרים</SelectItem>
                    <SelectItem value="1">ניסיון אחד נוסף</SelectItem>
                    <SelectItem value="2">2 ניסיונות נוספים</SelectItem>
                    <SelectItem value="3">3 ניסיונות נוספים</SelectItem>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Row 4: Cooldown time between syncs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-border/30 text-right items-start">
            <div className="space-y-1.5">
              <h3 className="font-black text-base text-foreground">המתנה בין סנכרונים</h3>
              <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                תקופת הצינון הנדרשת בין סנכרונים ידניים עוקבים כדי למנוע חסימת החשבון ע'י מערכות האבטחה של הבנק.
              </p>
            </div>
            <div className="flex gap-3 md:col-span-2 max-w-md w-full">
              <Controller
                name="cooldownValue"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <PremiumInput
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-24 text-center"
                  />
                )}
              />
              <div className="w-full">
                <Controller
                  name="cooldownUnit"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value}
                      onValueChange={onChange}
                      className='w-full'
                    >
                      <SelectItem value="seconds">שניות</SelectItem>
                      <SelectItem value="minutes">דקות</SelectItem>
                      <SelectItem value="hours">שעות</SelectItem>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Row 5: Connection Timeout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-border/30 text-right items-start">
            <div className="space-y-1.5">
              <h3 className="font-black text-base text-foreground">זמן התחברות (שניות)</h3>
              <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                הזמן המקסימלי שהמערכת תמתין לטעינת דף ההתחברות של הבנק או כרטיס האשראי.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2 max-w-md w-full">
              <Controller
                name="scraperLoginTimeoutSeconds"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <PremiumInput
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                  />
                )}
              />
            </div>
          </div>

          {/* Row 6: Default/Scrape Timeout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-6 text-right items-start">
            <div className="space-y-1.5">
              <h3 className="font-black text-base text-foreground">זמן סריקה (שניות)</h3>
              <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                הזמן המקסימלי שהמערכת תמתין לטעינת נתוני העובר ושב או העסקאות בתוך החשבון.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2 max-w-md w-full">
              <Controller
                name="scraperDefaultTimeoutSeconds"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <PremiumInput
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                  />
                )}
              />
            </div>
          </div>
        </>
      )}


      {/* Sticky Save Button Row */}
      <div
        className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-8 py-6 text-right items-center w-full"
      >
        <div className="hidden md:block" />
        <div className="md:col-span-2 max-w-md w-full flex justify-end">
          <PremiumButton
            onClick={handleSubmit(onSubmitForm)}
            disabled={saveScraperSettings.isPending}
            className="w-full md:w-auto px-10 shadow-lg shadow-primary/10"
          >
            {saveScraperSettings.isPending ? 'שומר שינויים...' : 'שמור שינויים'}
          </PremiumButton>
        </div>
      </div>

      {/* Browser Path Dialog */}
      <BrowserPathDialog
        open={isPathDialogOpen}
        onOpenChange={setIsPathDialogOpen}
        currentPath={scraperChromiumPath}
        onSave={(path) => setValue('scraperChromiumPath', path)}
      />
    </div>
  );
}
