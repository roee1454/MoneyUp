import {
  FileXls,
  DownloadSimple,
  CircleNotch,
  FilePdfIcon,
} from '@phosphor-icons/react';
import { PremiumCard } from '@/components/ui/premium-card';
import { PremiumButton } from '@/components/ui/premium-button';
import { FileJson } from 'lucide-react';

interface ExportActionsGridProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  onExportJSON: () => void;
  hasConnectedAccounts: boolean;
  isBusy: boolean;
  isExporting: string | null;
}

export function ExportActionsGrid({
  onExportCSV,
  onExportPDF,
  onExportJSON,
  hasConnectedAccounts,
  isBusy,
  isExporting,
}: ExportActionsGridProps) {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {/* CSV/Excel Card */}
      <PremiumCard className="p-6 flex flex-col justify-between h-[250px] border border-border/40 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300">
        <div className="space-y-3">
          <div className="h-12 w-12 bg-primary/10 flex items-center justify-center rounded-none border border-primary/20 shadow-xs">
            <FileXls className="h-6 w-6" weight="duotone" />
          </div>
          <h3 className="text-base font-black text-foreground">קובץ Excel (CSV)</h3>
          <p className="text-xs font-semibold text-muted-foreground/80 leading-relaxed">
            קובץ נתונים מובנה המותאם ל-Excel. כולל את רשימת העסקאות והמטא-דאטה הגולמי שלהן.
          </p>
        </div>
        <PremiumButton
          onClick={onExportCSV}
          disabled={isBusy || !hasConnectedAccounts || isExporting !== null}
          variant="default"
          className="w-full h-11 text-xs font-black border-primary/30 flex items-center justify-center gap-2 rounded-none transition-all duration-200 active:scale-98"
        >
          {isExporting === 'CSV' ? (
            <CircleNotch className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span>הורד Excel</span>
              <DownloadSimple className="h-4 w-4" weight="bold" />
            </>
          )}
        </PremiumButton>
      </PremiumCard>

      {/* PDF Card */}
      <PremiumCard className="p-6 flex flex-col justify-between h-[250px] border border-border/40 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300">
        <div className="space-y-3">
          <div className="h-12 w-12 bg-primary/10 flex items-center justify-center rounded-none border border-primary/20 shadow-xs">
            <FilePdfIcon className="h-6 w-6" weight="duotone" />
          </div>
          <h3 className="text-base font-black text-foreground">דו"ח PDF</h3>
          <p className="text-xs font-semibold text-muted-foreground/80 leading-relaxed">
            דו"ח הוצאות מרוכז המכיל מיתוג, תארכים, פירוט כרטיסים, וטבלת תנועות מפורטת.
          </p>
        </div>
        <PremiumButton
          onClick={onExportPDF}
          disabled={isBusy || !hasConnectedAccounts || isExporting !== null}
          variant="default"
          className="w-full h-11 text-xs font-black border-primary/30 flex items-center justify-center gap-2 rounded-none transition-all duration-200 active:scale-98"
        >
          {isExporting === 'PDF' ? (
            <CircleNotch className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span>שמור כ-PDF</span>
              <DownloadSimple className="h-4 w-4" weight="bold" />
            </>
          )}
        </PremiumButton>
      </PremiumCard>

      {/* JSON Backup Card */}
      <PremiumCard className="p-6 flex flex-col justify-between h-[250px] border border-border/40 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300 sm:col-span-2 lg:col-span-1">
        <div className="space-y-3">
          <div className="h-12 w-12 bg-primary/10 flex items-center justify-center rounded-none border border-primary/20 shadow-xs">
            <FileJson className="h-6 w-6" />
          </div>
          <h3 className="text-base font-black text-foreground">קובץ JSON</h3>
          <p className="text-xs font-semibold text-muted-foreground/80 leading-relaxed">
כל הנתונים הפיננסים לפי טווח התאריכים שנבחר בפורמט JSON.
          </p>
        </div>
        <PremiumButton
          onClick={onExportJSON}
          disabled={isBusy || !hasConnectedAccounts || isExporting !== null}
          variant="default"
          className="w-full h-11 text-xs font-black border-primary/30 flex items-center justify-center gap-2 rounded-none transition-all duration-200 active:scale-98"
        >
          {isExporting === 'JSON' ? (
            <CircleNotch className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span>הורד JSON</span>
              <DownloadSimple className="h-4 w-4" />
            </>
          )}
        </PremiumButton>
      </PremiumCard>
    </div>
  );
}
