import { toast } from 'sonner';
import {
  DownloadSimple,
  FileText,
  Database,
  FileXls,
} from '@phosphor-icons/react';
import { PremiumCard } from '@/components/ui/premium-card';
import { Button } from '@/components/ui/button';

export default function Export() {
  function handleExport(format: string) {
    toast.success(
      `ייצוא הנתונים בפורמט ${format} הושלם בהצלחה! ההורדה תתחיל בקרוב.`,
    );
  }

  return (
    <div
      className="space-y-6 text-right animate-in fade-in-50 duration-300"
      dir="rtl"
    >
      <div>
        <h1 className="text-3xl font-black text-foreground leading-tight">
          ייצוא נתונים
        </h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          בחר את פורמט ייצוא הנתונים הפיננסיים שלך. תוכל להוריד דוח מלא של כל
          הפעילויות, חשבונות הבנק וההוצאות.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        <PremiumCard className="p-5 flex flex-col justify-between h-48 border border-border bg-card">
          <div>
            <div className="h-10 w-10 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <FileXls className="h-5 w-5" weight="duotone" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              קובץ Excel / CSV
            </h3>
            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
              מתאים לעבודה ב-Google Sheets או Excel. כולל את כל הפעילויות
              הפיננסיות.
            </p>
          </div>
          <Button
            onClick={() => handleExport('CSV')}
            className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-none flex items-center justify-center gap-1.5 mt-4"
          >
            <span>הורד CSV</span>
            <DownloadSimple className="h-3.5 w-3.5" weight="duotone" />
          </Button>
        </PremiumCard>

        <PremiumCard className="p-5 flex flex-col justify-between h-48 border border-border bg-card">
          <div>
            <div className="h-10 w-10 rounded-none bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
              <FileText className="h-5 w-5" weight="duotone" />
            </div>
            <h3 className="text-sm font-bold text-foreground">דוח PDF מעוצב</h3>
            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
              דוח מסכם מעוצב המציג את מצב ההוצאות החודשי, חלוקה לקטגוריות
              ויתרות.
            </p>
          </div>
          <Button
            onClick={() => handleExport('PDF')}
            className="w-full h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-none flex items-center justify-center gap-1.5 mt-4"
          >
            <span>הורד PDF</span>
            <DownloadSimple className="h-3.5 w-3.5" weight="duotone" />
          </Button>
        </PremiumCard>

        <PremiumCard className="p-5 flex flex-col justify-between h-48 border border-border bg-card">
          <div>
            <div className="h-10 w-10 rounded-none bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <Database className="h-5 w-5" weight="duotone" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              גיבוי מלא JSON
            </h3>
            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
              קובץ נתונים מובנה המכיל את כל פרטי החשבון והגדרות ה-AI שלך לצורכי
              גיבוי.
            </p>
          </div>
          <Button
            onClick={() => handleExport('JSON')}
            className="w-full h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-none flex items-center justify-center gap-1.5 mt-4"
          >
            <span>הורד JSON</span>
            <DownloadSimple className="h-3.5 w-3.5" weight="duotone" />
          </Button>
        </PremiumCard>
      </div>
    </div>
  );
}
