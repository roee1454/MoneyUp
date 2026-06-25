import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PremiumButton } from '@/components/ui/premium-button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Warning } from '@phosphor-icons/react';

export type ExportFormatType = 'CSV' | 'PDF' | 'JSON';

interface ExportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: ExportFormatType | null;
  onConfirm: (config: { includeIncomes: boolean; selectedColumns: string[] }) => void;
}

/** Display labels for every selectable column / property */
const COLUMN_LABELS: Record<string, string> = {
  date: 'תאריך',
  description: 'בית עסק / תיאור',
  amount: 'סכום',
  type: 'סוג תנועה',
  category: 'קטגוריה',
  // JSON
  bankId: 'מזהה מוסד (bankId)',
  accountNumber: 'מספר חשבון',
  balance: 'יתרה',
  lastScrapedAt: 'סנכרון אחרון',
  transactions: 'פירוט תנועות',
};

/** Columns checked by default per format */
const DEFAULT_COLUMNS: Record<ExportFormatType, string[]> = {
  CSV: ['date', 'description', 'amount', 'type'],
  PDF: ['date', 'description', 'amount', 'type'],
  JSON: ['bankId', 'accountNumber', 'balance', 'lastScrapedAt', 'transactions'],
};

/** All available columns per format */
const ALL_COLUMNS: Record<ExportFormatType, string[]> = {
  CSV: ['date', 'description', 'amount', 'type', 'category'],
  PDF: ['date', 'description', 'amount', 'type', 'category'],
  JSON: ['bankId', 'accountNumber', 'balance', 'lastScrapedAt', 'transactions'],
};

export function ExportConfigDialog({
  open,
  onOpenChange,
  format,
  onConfirm,
}: ExportConfigDialogProps) {
  const [includeIncomes, setIncludeIncomes] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  /** Reset to defaults whenever the dialog opens for a new format */
  useEffect(() => {
    if (!open || !format) return;
    setSelectedColumns(DEFAULT_COLUMNS[format]);
    setIncludeIncomes(false);
  }, [format, open]);

  const handleToggle = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  const handleExport = () => {
    onConfirm({ includeIncomes, selectedColumns });
    onOpenChange(false);
  };

  const columns = format ? ALL_COLUMNS[format] : [];
  const isJson = format === 'JSON';
  const formatTitle =
    format === 'CSV' ? 'Excel / CSV' : format === 'PDF' ? 'PDF' : 'JSON';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-none border border-border bg-card text-foreground max-w-sm shadow-2xl p-6 text-right"
        dir="rtl"
      >
        <DialogHeader className="text-right space-y-0.5 pb-4 border-b border-border/40">
          <DialogTitle className="text-base font-black tracking-tight text-foreground">
            ייצוא {formatTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            בחר אילו שדות לכלול בקובץ המיוצא.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Columns checklist */}
          <div className="space-y-1">
            {columns.map((col) => {
              const id = `col-${col}`;
              return (
                <div
                  key={col}
                  className="flex items-center gap-3 py-2 px-1 cursor-pointer select-none hover:bg-muted/10 rounded-none transition-colors"
                  onClick={() => handleToggle(col)}
                >
                  <Checkbox
                    id={id}
                    checked={selectedColumns.includes(col)}
                    onCheckedChange={() => handleToggle(col)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label
                    htmlFor={id}
                    className="text-xs font-semibold text-foreground cursor-pointer"
                  >
                    {COLUMN_LABELS[col] || col}
                  </Label>
                </div>
              );
            })}
          </div>

          {/* Bank incomes toggle — only relevant for CSV/PDF */}
          {!isJson && (
            <div className="flex items-center justify-between p-3 border border-border/60 bg-muted/10">
              <div className="space-y-0.5 text-right pl-2">
                <Label className="text-xs font-black text-foreground block">כלול הכנסות מהבנק</Label>
                <span className="text-[10px] font-semibold text-muted-foreground block leading-normal">
                  ייצא גם תנועות זכות בחשבון העו״ש (יתווסף לצד הוצאות כרטיסי האשראי).
                </span>
              </div>
              <Switch
                checked={includeIncomes}
                onCheckedChange={setIncludeIncomes}
                className="scale-90 shrink-0"
              />
            </div>
          )}

          {/* Validation warning */}
          {selectedColumns.length === 0 && (
            <div className="flex gap-2 items-center p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold">
              <Warning className="h-4 w-4 shrink-0" weight="fill" />
              <span>יש לבחור לפחות שדה אחד.</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border/40 pt-4">
          <PremiumButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-none text-xs font-black"
          >
            ביטול
          </PremiumButton>
          <PremiumButton
            type="button"
            onClick={handleExport}
            disabled={selectedColumns.length === 0}
            className="h-9 px-5 rounded-none text-xs font-black"
          >
            הורד
          </PremiumButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
