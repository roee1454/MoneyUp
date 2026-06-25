import React, { useState } from 'react';
import { toast } from 'sonner';
import { Warning } from '@phosphor-icons/react';
import { useAccounts, isCreditCompanyBankId, isBankAccountBankId } from '@/hooks/useAccounts';
import { toDateInputValue } from '@money-up/common';
import { format, parseISO } from 'date-fns';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { useMutation } from '@tanstack/react-query';
import { useSpendingScans } from '@/hooks/useAiSpending';

import { api } from '@/lib/api';

// Child components
import { ExportHeader } from '@/features/export/components/ExportHeader';
import { ExportMetricsGrid } from '@/features/export/components/ExportMetricsGrid';
import { ExportActionsGrid } from '@/features/export/components/ExportActionsGrid';
import { PrintableReportTemplate } from '@/features/export/components/PrintableReportTemplate';
import { ExportConfigDialog, type ExportFormatType } from '@/features/export/components/ExportConfigDialog';

export default function Export() {
  const shouldReduceMotion = useReducedMotion();
  const isAnimated = !shouldReduceMotion;

  // Default range: from 1st of current month until today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return toDateInputValue(d);
  });
  const [endDate, setEndDate] = useState(() => {
    return toDateInputValue(new Date());
  });

  const { data: accounts = [], isLoading, isFetching } = useAccounts({
    startDate,
    endDate,
  });

  const { data: rawScans, isLoading: isLoadingScans } = useSpendingScans({
    period: 'current',
    startDate,
    endDate,
  });

  // Filter out bank accounts, keeping only credit company (expense) accounts
  const creditAccounts = React.useMemo(() => {
    return accounts.filter((acc) => isCreditCompanyBankId(acc.bankId));
  }, [accounts]);

  const bankAccounts = React.useMemo(() => {
    return accounts.filter((acc) => isBankAccountBankId(acc.bankId));
  }, [accounts]);

  // Calculate totals
  const totalTransactions = React.useMemo(() => {
    return creditAccounts.reduce((acc, curr) => acc + (curr.transactions?.length || 0), 0);
  }, [creditAccounts]);

  const totalExpensesAmount = React.useMemo(() => {
    if (!rawScans) return 0;
    let total = 0;
    for (const catName in rawScans.categoryTransactions) {
      const txns = rawScans.categoryTransactions[catName].filter((t) =>
        isCreditCompanyBankId(t.bankId),
      );
      if (txns.length > 0) {
        total += txns.reduce((sum, t) => sum + t.amount, 0);
      }
    }
    return total;
  }, [rawScans]);

  const totalIncomesAmount = React.useMemo(() => {
    return bankAccounts.reduce((sum, acc) => {
      const accountIncomes = (acc.transactions ?? [])
        .filter((t) => !t.isDuplicate && Number(t.chargedAmount ?? t.amount ?? 0) > 0)
        .reduce((accSum, t) => accSum + Number(t.chargedAmount ?? t.amount ?? 0), 0);
      return sum + accountIncomes;
    }, 0);
  }, [bankAccounts]);

  const creditAccountIds = React.useMemo(() => {
    return [...new Set(creditAccounts.map((a) => a.bankId))];
  }, [creditAccounts]);

  const bankAccountIds = React.useMemo(() => {
    return [...new Set(bankAccounts.map((a) => a.bankId))];
  }, [bankAccounts]);

  /**
   * Builds a txn-identifier -> category name lookup from the AI scans result.
   * Falls back to an empty map when scans are not yet loaded.
   */
  const categoryMap = React.useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    if (!rawScans?.categoryTransactions) return map;
    for (const catName in rawScans.categoryTransactions) {
      for (const txn of rawScans.categoryTransactions[catName]) {
        if (txn.transactionId) map.set(txn.transactionId, catName);
      }
    }
    return map;
  }, [rawScans]);

  // Interface for file save mutations to avoid explicit 'any'
  interface SaveFileResult {
    aborted?: boolean;
    success?: boolean;
    filepath?: string;
    fallback?: boolean;
    isPdf?: boolean;
  }

  // Mutation for unified file saving with abort checks & web fallbacks
  const saveFileMutation = useMutation({
    mutationFn: async ({
      content,
      suggestedName,
      mimeType,
      extension,
    }: {
      content: string;
      suggestedName: string;
      mimeType: string;
      extension: string;
    }): Promise<SaveFileResult> => {
      try {
        const res = await api.post<{ success: boolean; filepath?: string; aborted?: boolean; error?: string }>('/export/save', {
          content,
          filename: suggestedName,
          extension,
        });

        if (res.aborted) {
          return { aborted: true };
        }

        if (res.success && res.filepath) {
          return { success: true, filepath: res.filepath };
        }
      } catch (err) {
        console.warn('Backend saving failed, running browser fallback:', err);
      }

        // Web Fallback
        if (extension.toLowerCase() === 'pdf') {
          const originalTitle = document.title;
          document.title = suggestedName.replace(/\.pdf$/i, '');
          window.print();
          document.title = originalTitle;
          return { success: true, fallback: true, isPdf: true };
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, fallback: true };
      },
      onSuccess: (data: SaveFileResult) => {
        if (data?.aborted) {
          toast.info('שמירת הקובץ בוטלה על ידי המשתמש');
          return;
        }
        if (data?.fallback) {
          if (data.isPdf) {
            toast.success('דוח PDF מוכן להדפסה!');
          } else {
            toast.success('קובץ הורד בהצלחה בדפדפן!');
          }
        } else if (data?.success && data?.filepath) {
          toast.success(`הקובץ נשמר בהצלחה בנתיב: ${data.filepath}`);
        }
      },
      onError: (error: Error) => {
        toast.error(`שגיאה בשמירת הקובץ: ${error.message}`);
      },
  });

  const [activeExportFormat, setActiveExportFormat] = useState<ExportFormatType | null>(null);
  const [selectedPdfColumns, setSelectedPdfColumns] = useState<string[]>(['date', 'description', 'amount', 'type']);
  const [includePdfIncomes, setIncludePdfIncomes] = useState(false);

  const handleConfirmExport = (config: { includeIncomes: boolean; selectedColumns: string[] }) => {
    if (activeExportFormat === 'CSV') {
      handleExportCSV(config.selectedColumns, config.includeIncomes);
    } else if (activeExportFormat === 'JSON') {
      handleExportJSON(config.selectedColumns, config.includeIncomes);
    } else if (activeExportFormat === 'PDF') {
      setSelectedPdfColumns(config.selectedColumns);
      setIncludePdfIncomes(config.includeIncomes);
      // Wait for rendering update
      setTimeout(() => {
        handleExportPDF();
      }, 100);
    }
    setActiveExportFormat(null);
  };

  const handleExportCSV = (selectedColumns: string[], includeIncomes: boolean) => {
    const labelMap: Record<string, string> = {
      date: 'תאריך',
      description: 'בית עסק',
      amount: 'סכום לחיוב',
      currency: 'מטבע',
      type: 'סוג תנועה',
      category: 'קטגוריה',
    };

    const headers = selectedColumns.map((col) => labelMap[col] || col).join(',');
    const rows: string[] = [];

    const exportAccounts = includeIncomes
      ? accounts
      : creditAccounts;

    for (const account of exportAccounts) {
      const isBank = isBankAccountBankId(account.bankId);
      const rawTxns = account.transactions || [];

      const txns = isBank
        ? rawTxns.filter((t) => !t.isDuplicate && Number(t.chargedAmount ?? t.amount ?? 0) > 0)
        : rawTxns;

      for (const txn of txns) {
        const isIncome = Number(txn.chargedAmount ?? txn.amount ?? 0) > 0;
        const rowData: string[] = [];

        for (const col of selectedColumns) {
          if (col === 'date') {
            rowData.push(txn.date ? format(parseISO(txn.date), 'dd/MM/yyyy') : '');
          } else if (col === 'description') {
            const desc = txn.description || (isBank ? 'הכנסה' : 'עסקה ללא שם');
            rowData.push(`"${desc.replace(/"/g, '""')}"`);
          } else if (col === 'amount') {
            const amt = txn.chargedAmount != null ? txn.chargedAmount : txn.amount;
            rowData.push(`${isIncome ? '+' : '-'}${amt}`);
          } else if (col === 'type') {
            const typeLabel = isBank
              ? 'הכנסה'
              : txn.type === 'installments'
              ? 'תשלומים'
              : 'רגיל';
            rowData.push(typeLabel);
          } else if (col === 'category') {
            const cat =
              (txn.id ? categoryMap.get(String(txn.id)) : undefined) ??
              (txn.identifier ? categoryMap.get(String(txn.identifier)) : undefined) ??
              (isBank ? 'הכנסה' : 'לא מסווג');
            rowData.push(`"${cat.replace(/"/g, '""')}"`);
          }
        }
        rows.push(rowData.join(','));
      }
    }

    const csvContent = '\uFEFF' + headers + '\r\n' + rows.join('\r\n');
    const filename = `MoneyUp_Export_${startDate}_to_${endDate}.csv`;
    saveFileMutation.mutate({
      content: csvContent,
      suggestedName: filename,
      mimeType: 'text/csv;charset=utf-8;',
      extension: 'csv',
    });
  };

  const handleExportJSON = (selectedColumns: string[], includeIncomes: boolean) => {
    const exportAccounts = includeIncomes
      ? accounts
      : creditAccounts;

    const dataToExport = exportAccounts.map((acc) => {
      const isBank = isBankAccountBankId(acc.bankId);
      const rawTxns = acc.transactions || [];

      const txns = isBank
        ? rawTxns.filter((t) => !t.isDuplicate && Number(t.chargedAmount ?? t.amount ?? 0) > 0)
        : rawTxns;

      const accObj: Record<string, any> = {};

      if (selectedColumns.includes('bankId')) accObj.bankId = acc.bankId;
      if (selectedColumns.includes('accountNumber')) accObj.accountNumber = acc.accountNumber;
      if (selectedColumns.includes('balance')) accObj.balance = acc.balance;
      if (selectedColumns.includes('lastScrapedAt')) accObj.lastScrapedAt = acc.lastScrapedAt;

      if (selectedColumns.includes('transactions')) {
        accObj.transactions = txns.map((txn) => ({
          id: txn.id,
          date: txn.date,
          processedDate: txn.processedDate,
          amount: txn.amount,
          chargedAmount: txn.chargedAmount,
          description: txn.description,
          memo: txn.memo,
          originalCurrency: txn.originalCurrency,
          isDuplicate: txn.isDuplicate,
          type: isBank ? 'income' : txn.type,
          identifier: txn.identifier,
          originalAmount: txn.originalAmount,
          chargedCurrency: txn.chargedCurrency,
          status: txn.status,
          installmentNumber: txn.installmentNumber,
          installmentTotal: txn.installmentTotal,
        }));
      }

      return accObj;
    });

    const jsonContent = JSON.stringify(dataToExport, null, 2);
    const filename = `MoneyUp_Backup_${startDate}_to_${endDate}.json`;
    saveFileMutation.mutate({
      content: jsonContent,
      suggestedName: filename,
      mimeType: 'application/json',
      extension: 'json',
    });
  };

  const handleExportPDF = () => {
    const printElement = document.querySelector('.print-area');
    if (!printElement) {
      toast.error('שגיאה: רכיב ההדפסה לא נמצא בדף');
      return;
    }

    const htmlContent = printElement.outerHTML;
    const filename = `MoneyUp_Report_${startDate}_to_${endDate}.pdf`;
    saveFileMutation.mutate({
      content: htmlContent,
      suggestedName: filename,
      mimeType: 'application/pdf',
      extension: 'pdf',
    });
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const LayoutContainer = isAnimated ? motion.div : 'div';
  const MotionItem = isAnimated ? motion.div : 'div';

  const isBusy = isLoading || isFetching || isLoadingScans;

  return (
    <LayoutContainer
      className="space-y-7 py-8 text-right select-none"
      dir="rtl"
      {...(isAnimated ? { variants: containerVariants, initial: 'hidden', animate: 'visible' } : {})}
    >
      <MotionItem {...(isAnimated ? { variants: itemVariants } : {})}>
        <ExportHeader
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          isBusy={isBusy}
        />
      </MotionItem>

      <MotionItem {...(isAnimated ? { variants: itemVariants } : {})}>
        <ExportMetricsGrid
          totalExpensesAmount={totalExpensesAmount}
          totalIncomesAmount={totalIncomesAmount}
          creditAccountIds={creditAccountIds}
          bankAccountIds={bankAccountIds}
          isBusy={isBusy}
        />
      </MotionItem>

      <MotionItem {...(isAnimated ? { variants: itemVariants } : {})}>
        <ExportActionsGrid
          onExportCSV={() => setActiveExportFormat('CSV')}
          onExportPDF={() => setActiveExportFormat('PDF')}
          onExportJSON={() => setActiveExportFormat('JSON')}
          hasConnectedAccounts={creditAccounts.length > 0}
          isBusy={isBusy}
          isExporting={saveFileMutation.isPending ? saveFileMutation.variables?.extension.toUpperCase() || null : null}
        />
      </MotionItem>

      {creditAccounts.length === 0 && !isLoading && !isFetching && (
        <MotionItem
          className="bg-muted/40 border border-border p-4 text-right flex gap-3 items-start rounded-none animate-in fade-in-50 duration-300"
          {...(isAnimated ? { variants: itemVariants } : {})}
        >
          <Warning className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" weight="fill" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-foreground">לא מחוברת חברת אשראי</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              עליך לחבר חברת אשראי לפרופיל שלך כדי שתוכל לראות, לייצא ולייצר דוחות עבור ההוצאות שלך. ניתן לחבר חברת אשראי דרך כפתור "חיבור חשבון" בדף הבית.
            </p>
          </div>
        </MotionItem>
      )}

      {creditAccounts.length > 0 && totalTransactions === 0 && !isLoading && !isFetching && (
        <MotionItem
          className="bg-amber-500/10 border border-amber-500/20 p-4 text-right flex gap-3 items-start rounded-none animate-in fade-in-50 duration-300"
          {...(isAnimated ? { variants: itemVariants } : {})}
        >
          <Warning className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" weight="fill" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-foreground">לא נמצאו תנועות לטווח שנבחר</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              אנא בחר טווח תאריכים אחר שבו קיימת פעילות פיננסית, או בצע סנכרון מחדש מול המוסדות הפיננסיים בדף הבית.
            </p>
          </div>
        </MotionItem>
      )}

      <PrintableReportTemplate
        startDate={startDate}
        endDate={endDate}
        accounts={selectedPdfColumns.length > 0 && includePdfIncomes ? [...bankAccounts, ...creditAccounts] : creditAccounts}
        selectedColumns={selectedPdfColumns}
        includeIncomes={includePdfIncomes}
        categoryMap={categoryMap}
      />

      <ExportConfigDialog
        open={activeExportFormat !== null}
        onOpenChange={(open) => { if (!open) setActiveExportFormat(null); }}
        format={activeExportFormat}
        onConfirm={handleConfirmExport}
      />
    </LayoutContainer>
  );
}
