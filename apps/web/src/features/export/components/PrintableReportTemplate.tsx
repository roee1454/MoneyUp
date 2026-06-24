import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { BankAccount } from '@/hooks/useAccounts';

interface PrintableReportTemplateProps {
  startDate: string;
  endDate: string;
  creditAccounts: BankAccount[];
  totalTransactions: number;
}

export function PrintableReportTemplate({
  startDate,
  endDate,
  creditAccounts,
  totalTransactions,
}: PrintableReportTemplateProps) {
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
          <h1 className="text-2xl font-black tracking-tight">דוח פעילות פיננסית מרוכז</h1>
          <p className="text-xs text-black/75 mt-1">
            טווח תאריכים: {format(parseISO(startDate), 'dd/MM/yyyy')} עד {format(parseISO(endDate), 'dd/MM/yyyy')}
          </p>
        </div>
        <div className="text-left">
          <h2 className="text-xl font-black tracking-tight">MoneyUp</h2>
          <p className="text-[10px] text-black/60 font-bold mt-0.5">הופק ב- {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="mb-6">
        <h3 className="text-sm font-black mb-2 border-b border-black pb-1">יתרות כרטיסי אשראי</h3>
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2 font-bold text-right">מוסד פיננסי</th>
              <th className="py-2 font-bold text-right">מספר כרטיס</th>
              <th className="py-2 font-bold text-left">יתרה</th>
            </tr>
          </thead>
          <tbody>
            {creditAccounts.map((acc, index) => (
              <tr key={index} className="border-b border-black/10">
                <td className="py-2 font-bold">{acc.bankId.toUpperCase()}</td>
                <td className="py-2">{acc.accountNumber}</td>
                <td className="py-2 text-left font-bold tabular-nums">
                  {acc.balance != null ? `${acc.balance.toLocaleString()} ₪` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transactions Table */}
      <div>
        <h3 className="text-sm font-black mb-2 border-b border-black pb-1">פירוט תנועות</h3>
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-black/5">
              <th className="p-2 font-bold text-right">תאריך</th>
              <th className="p-2 font-bold text-right">כרטיס</th>
              <th className="p-2 font-bold text-right">בית עסק</th>
              <th className="p-2 font-bold text-right">סוג</th>
              <th className="p-2 font-bold text-left">סכום</th>
            </tr>
          </thead>
          <tbody>
            {creditAccounts.flatMap((acc) =>
              (acc.transactions || []).map((txn, index) => {
                const formattedDate = txn.date ? format(parseISO(txn.date), 'dd/MM/yyyy') : '';
                const amount = txn.chargedAmount != null ? txn.chargedAmount : txn.amount;
                const type = txn.type === 'installments' ? 'תשלומים' : 'רגיל';
                return (
                  <tr key={`${acc.accountNumber}-${txn.id}-${index}`} className="border-b border-black/10">
                    <td className="p-2 tabular-nums">{formattedDate}</td>
                    <td className="p-2">{acc.bankId.toUpperCase()} ({acc.accountNumber.slice(-4)})</td>
                    <td className="p-2 font-medium">{txn.description || 'עסקה ללא שם'}</td>
                    <td className="p-2">{type}</td>
                    <td className={cn("p-2 text-left font-bold tabular-nums", amount < 0 ? "text-red-700" : "text-emerald-700")}>
                      {amount.toLocaleString()}₪
                    </td>
                  </tr>
                );
              })
            )}
            {totalTransactions === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-black/50 font-bold">אין תנועות להצגה בטווח התאריכים הנבחר.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
