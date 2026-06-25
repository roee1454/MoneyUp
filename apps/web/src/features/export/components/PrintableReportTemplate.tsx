import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFormatMoney } from '@/hooks/useFormatMoney';
import { type BankAccount, isBankAccountBankId } from '@/hooks/useAccounts';
import React from 'react';

interface PrintableReportTemplateProps {
  startDate: string;
  endDate: string;
  accounts: BankAccount[];
  selectedColumns: string[];
  includeIncomes: boolean;
  categoryMap: Map<string, string>;
}

/**
 * Formats a monetary amount with a sign prefix that appears before the currency symbol.
 * e.g. "+₪250.00" or "-₪250.00" instead of "₪+250.00".
 */
function formatSignedAmount(formatted: string, isIncome: boolean): string {
  const sign = isIncome ? '+' : '-';
  // Trim any leading minus the formatter may have added for negative values
  const stripped = formatted.replace(/^[−\-]/, '');
  return `${sign}${stripped}`;
}

export function PrintableReportTemplate({
  startDate,
  endDate,
  accounts,
  selectedColumns,
  includeIncomes,
  categoryMap,
}: PrintableReportTemplateProps) {
  const formatMoney = useFormatMoney();

  /** Only show accounts that have an actual balance value in the header table */
  const accountsWithBalance = React.useMemo(
    () => accounts.filter((acc) => acc.balance != null),
    [accounts],
  );

  const printableTxns = React.useMemo(() => {
    return accounts
      .flatMap((acc) => {
        const isBank = isBankAccountBankId(acc.bankId);
        const rawTxns = acc.transactions || [];

        const filteredTxns = isBank
          ? rawTxns.filter((t) => !t.isDuplicate && Number(t.chargedAmount ?? t.amount ?? 0) > 0)
          : rawTxns;

        return filteredTxns.map((txn) => {
          const isIncome = Number(txn.chargedAmount ?? txn.amount ?? 0) > 0;
          const amount = txn.chargedAmount != null ? txn.chargedAmount : txn.amount;
          const formattedDate = txn.date ? format(parseISO(txn.date), 'dd/MM/yyyy') : '';
          const type = isBank
            ? 'הכנסה'
            : txn.type === 'installments'
            ? 'תשלומים'
            : 'רגיל';

          return {
            id: txn.id,
            date: formattedDate,
            rawDate: txn.date,
            accountNumber: acc.accountNumber,
            bankId: acc.bankId,
            description: txn.description || 'עסקה ללא שם',
            type,
            amount,
            isIncome,
            category:
              (txn.id ? categoryMap.get(String(txn.id)) : undefined) ??
              (txn.identifier ? categoryMap.get(String(txn.identifier)) : undefined) ??
              (isBank ? 'הכנסה' : 'לא מסווג'),
          };
        });
      })
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
  }, [accounts, categoryMap]);

  return (
    <div className="print-area hidden print:block w-full text-right p-6 font-sans bg-white text-black" dir="rtl">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            direction: rtl;
          }
          @page {
            size: A4;
            margin: 1.5cm;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6" dir="rtl">
        <div className="text-right">
          <h1 className="text-2xl font-black tracking-tight">דו"ח פיננסי מרוכז</h1>
          <p className="text-xs text-black/75 mt-1">
            טווח תאריכים: {format(parseISO(startDate), 'dd/MM/yyyy')} עד {format(parseISO(endDate), 'dd/MM/yyyy')}
          </p>
        </div>
        <div className="text-left">
          <h2 className="text-xl font-black tracking-tight">MoneyUp</h2>
          <p className="text-[10px] text-black/60 font-bold mt-0.5">הופק ב- {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </div>

      {/* Accounts Balance Table — only accounts with a known balance */}
      {accountsWithBalance.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-black mb-2 border-b border-black pb-1">
            {includeIncomes ? 'יתרות חשבונות עו״ש וכרטיסי אשראי' : 'יתרות כרטיסי אשראי'}
          </h3>
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-black">
                <th className="py-2 font-bold text-right">מוסד פיננסי</th>
                <th className="py-2 font-bold text-right">מספר חשבון / כרטיס</th>
                <th className="py-2 font-bold text-left">יתרה</th>
              </tr>
            </thead>
            <tbody>
              {accountsWithBalance.map((acc, index) => (
                <tr key={index} className="border-b border-black/10">
                  <td className="py-2 font-bold">{acc.bankId.toUpperCase()}</td>
                  <td className="py-2">{acc.accountNumber}</td>
                  <td className="py-2 text-left font-bold tabular-nums">
                    {formatMoney(acc.balance!)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transactions Table */}
      <div>
        <h3 className="text-sm font-black mb-2 border-b border-black pb-1">פירוט תנועות</h3>
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-black/5">
              {selectedColumns.includes('date') && <th className="p-2 font-bold text-right">תאריך</th>}
              <th className="p-2 font-bold text-right">כרטיס / חשבון</th>
              {selectedColumns.includes('description') && <th className="p-2 font-bold text-right">בית עסק / תיאור</th>}
              {selectedColumns.includes('category') && <th className="p-2 font-bold text-right">קטגוריה</th>}
              {selectedColumns.includes('type') && <th className="p-2 font-bold text-right">סוג</th>}
              {selectedColumns.includes('amount') && <th className="p-2 font-bold text-left">סכום</th>}
            </tr>
          </thead>
          <tbody>
            {printableTxns.map((txn, index) => (
              <tr key={`${txn.bankId}-${txn.accountNumber}-${txn.id}-${index}`} className="border-b border-black/10">
                {selectedColumns.includes('date') && <td className="p-2 tabular-nums">{txn.date}</td>}
                <td className="p-2">{txn.bankId.toUpperCase()} ({txn.accountNumber.slice(-4)})</td>
                {selectedColumns.includes('description') && <td className="p-2 font-medium">{txn.description}</td>}
                {selectedColumns.includes('category') && <td className="p-2">{txn.category}</td>}
                {selectedColumns.includes('type') && <td className="p-2">{txn.type}</td>}
                {selectedColumns.includes('amount') && (
                  <td className={cn('p-2 text-left font-bold tabular-nums', txn.isIncome ? 'text-emerald-700' : 'text-red-700')}>
                    {formatSignedAmount(formatMoney(Math.abs(txn.amount ?? 0)), txn.isIncome)}
                  </td>
                )}
              </tr>
            ))}
            {printableTxns.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-black/50 font-bold">אין תנועות להצגה בטווח התאריכים הנבחר.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
