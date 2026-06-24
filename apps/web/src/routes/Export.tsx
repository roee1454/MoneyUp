import React, { useState } from 'react';
import { toast } from 'sonner';
import { Warning } from '@phosphor-icons/react';
import { useAccounts, isCreditCompanyBankId } from '@/hooks/useAccounts';
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

  const creditAccountIds = React.useMemo(() => {
    return [...new Set(creditAccounts.map((a) => a.bankId))];
  }, [creditAccounts]);

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
    }) => {
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
      onSuccess: (data: any) => {
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
      onError: (error: any) => {
        toast.error(`שגיאה בשמירת הקובץ: ${error.message}`);
      },
  });

  const handleExportCSV = () => {
    const headers = ['בית עסק', 'תאריך', 'סכום לחיוב', 'מטבע', 'סוג תנועה'].join(',');
    const rows: string[] = [];

    for (const account of creditAccounts) {
       for (const txn of account.transactions || []) {
         const merchant = txn.description || 'עסקה ללא שם';
         const formattedDate = txn.date ? format(parseISO(txn.date), 'dd/MM/yyyy') : '';
         const amount = txn.chargedAmount != null ? txn.chargedAmount : txn.amount;
         const currency = txn.originalCurrency || 'ILS';
         const type = txn.type === 'installments' ? 'תשלומים' : 'רגיל';

         const escapedMerchant = `"${merchant.replace(/"/g, '""')}"`;
         rows.push([escapedMerchant, formattedDate, amount, currency, type].join(','));
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

  const handleExportJSON = () => {
    const dataToExport = creditAccounts.map((acc) => ({
      bankId: acc.bankId,
      accountNumber: acc.accountNumber,
      balance: acc.balance,
      lastScrapedAt: acc.lastScrapedAt,
      transactions: (acc.transactions || []).map((txn) => ({
        id: txn.id,
        date: txn.date,
        processedDate: txn.processedDate,
        amount: txn.amount,
        chargedAmount: txn.chargedAmount,
        description: txn.description,
        memo: txn.memo,
        originalCurrency: txn.originalCurrency,
        isDuplicate: txn.isDuplicate,
        type: txn.type,
        identifier: txn.identifier,
        originalAmount: txn.originalAmount,
        chargedCurrency: txn.chargedCurrency,
        status: txn.status,
        installmentNumber: txn.installmentNumber,
        installmentTotal: txn.installmentTotal,
      })),
    }));

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
          creditAccountsCount={creditAccounts.length}
          totalTransactions={totalTransactions}
          totalExpensesAmount={totalExpensesAmount}
          creditAccountIds={creditAccountIds}
          isBusy={isBusy}
        />
      </MotionItem>

      <MotionItem {...(isAnimated ? { variants: itemVariants } : {})}>
        <ExportActionsGrid
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onExportJSON={handleExportJSON}
          totalTransactions={totalTransactions}
          creditAccountsCount={creditAccounts.length}
          isBusy={isBusy}
          isExporting={saveFileMutation.isPending ? saveFileMutation.variables?.extension.toUpperCase() || null : null}
        />
      </MotionItem>

      {totalTransactions === 0 && !isLoading && !isFetching && (
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
        creditAccounts={creditAccounts}
        totalTransactions={totalTransactions}
      />
    </LayoutContainer>
  );
}
