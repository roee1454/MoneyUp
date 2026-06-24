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
  totalTransactions: number;
  creditAccountsCount: number;
  isBusy: boolean;
  isExporting: string | null;
}

export function ExportActionsGrid({
  onExportCSV,
  onExportPDF,
  onExportJSON,
  totalTransactions,
  creditAccountsCount,
  isBusy,
  isExporting,
}: ExportActionsGridProps) {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {/* CSV/Excel Card */}
      <PremiumCard className="p-6 flex flex-col justify-between h-[250px] border border-border/40 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300">
        <div className="space-y-3">
          <div className="h-12 w-12 bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 rounded-none border border-emerald-500/20 shadow-xs">
            <FileXls className="h-6 w-6" weight="duotone" />
          </div>
          <h3 className="text-base font-black text-foreground">קובץ Excel (CSV)</h3>
          <p className="text-xs font-semibold text-muted-foreground/80 leading-relaxed">
            קובץ נתונים מובנה המותאם ל-Excel ול-Google Sheets. כולל את רשימת העסקאות והמטא-דאטה הגולמי שלהן (ללא קטגוריות).
          </p>
        </div>
        <PremiumButton
          onClick={onExportCSV}
          disabled={isBusy || totalTransactions === 0 || isExporting !== null}
          variant="outline"
          className="w-full h-11 text-xs font-black border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 hover:border-emerald-500 flex items-center justify-center gap-2 rounded-none transition-all duration-200 active:scale-98"
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
          <div className="h-12 w-12 bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 rounded-none border border-rose-500/20 shadow-xs">
            <FilePdfIcon className="h-6 w-6" weight="duotone" />
          </div>
          <h3 className="text-base font-black text-foreground">דוח PDF מעוצב</h3>
          <p className="text-xs font-semibold text-muted-foreground/80 leading-relaxed">
            דוח פיננסי מרוכז הכולל מיתוג, סיכום יתרות חשבון ופירוט תנועות מסודר בטבלה מעוצבת. מותאם להדפסה ולשמירה.
          </p>
        </div>
        <PremiumButton
          onClick={onExportPDF}
          disabled={isBusy || totalTransactions === 0 || isExporting !== null}
          variant="outline"
          className="w-full h-11 text-xs font-black border-rose-500/30 text-rose-600 hover:bg-rose-500/5 hover:border-rose-500 flex items-center justify-center gap-2 rounded-none transition-all duration-200 active:scale-98"
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
          <div className="h-12 w-12 bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 rounded-none border border-blue-500/20 shadow-xs">
            <FileJson className="h-6 w-6" />
          </div>
          <h3 className="text-base font-black text-foreground">גיבוי מלא JSON</h3>
          <p className="text-xs font-semibold text-muted-foreground/80 leading-relaxed">
            חילוץ מלא של כל הנתונים הפיננסיים והמטא-דאטה שנאספו במערכת לטווח התאריכים הנבחר כקובץ JSON מובנה.
          </p>
        </div>
        <PremiumButton
          onClick={onExportJSON}
          disabled={isBusy || creditAccountsCount === 0 || isExporting !== null}
          variant="outline"
          className="w-full h-11 text-xs font-black border-blue-500/30 text-blue-600 hover:bg-blue-500/5 hover:border-blue-500 flex items-center justify-center gap-2 rounded-none transition-all duration-200 active:scale-98"
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
