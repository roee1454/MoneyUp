import { useState, useEffect } from 'react';
import { Warning, ArrowsClockwise } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { z } from 'zod';
import { PremiumCard } from '@/components/ui/premium-card';
import { useDetectChromium } from '@/hooks/useScrapers';
import { useUpdateScraperSettings } from '@/hooks/useUsers';
import type { User } from '@/hooks/useUsers';
import { BrowserPathDialog } from './BrowserPathDialog';
import { InstallBrowserCard } from './InstallBrowserCard';
import { ScraperSettingsCard } from './ScraperSettingsCard';
import { DetectingBrowserCard } from './DetectingBrowserCard';
import { InstallingBrowserCard } from './InstallingBrowserCard';
import { API_BASE } from '@/lib/api';

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

  const [isPathDialogOpen, setIsPathDialogOpen] = useState(false);

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
    <section className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-none bg-primary flex items-center justify-center">
            <ArrowsClockwise
              className="h-4 w-4 text-primary-foreground"
              weight="bold"
            />
          </div>
          <h2 className="text-xl font-black text-foreground">
            הגדרות סורק Chromium
          </h2>
        </div>
      </div>

      {isDetecting ? (
        <DetectingBrowserCard />
      ) : isInstalling ? (
        <InstallingBrowserCard
          progress={installProgress}
          logs={installLogs}
        />
      ) : !scraperChromiumPath ? (
        <InstallBrowserCard
          availableBrowsers={availableBrowsers}
          isInstalling={isInstalling}
          onInstall={handleInstallChromium}
          onDetect={handleAutoDetectChromium}
        />
      ) : (
        <ScraperSettingsCard
          scraperChromiumPath={scraperChromiumPath}
          scraperShowBrowser={scraperShowBrowser}
          setScraperShowBrowser={setScraperShowBrowser}
          showAdvancedScraper={showAdvancedScraper}
          setShowAdvancedScraper={setShowAdvancedScraper}
          scraperTimeoutRetryCount={scraperTimeoutRetryCount}
          setScraperTimeoutRetryCount={setScraperTimeoutRetryCount}
          cooldownValue={cooldownValue}
          setCooldownValue={setCooldownValue}
          cooldownUnit={cooldownUnit}
          setCooldownUnit={setCooldownUnit}
          scraperLoginTimeoutSeconds={scraperLoginTimeoutSeconds}
          setScraperLoginTimeoutSeconds={setScraperLoginTimeoutSeconds}
          scraperDefaultTimeoutSeconds={scraperDefaultTimeoutSeconds}
          setScraperDefaultTimeoutSeconds={setScraperDefaultTimeoutSeconds}
          isDetecting={isDetecting}
          onDetect={handleAutoDetectChromium}
          onSaveAll={handleSaveScraperSettings}
          isPending={saveScraperSettings.isPending}
          onOpenPathDialog={() => setIsPathDialogOpen(true)}
        />
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

      {/* Browser Path Dialog */}
      <BrowserPathDialog
        open={isPathDialogOpen}
        onOpenChange={setIsPathDialogOpen}
        currentPath={scraperChromiumPath}
        onSave={setScraperChromiumPath}
      />
    </section>
  );
}
