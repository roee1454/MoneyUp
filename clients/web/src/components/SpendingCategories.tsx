import { useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PremiumCard } from '@/components/ui/premium-card';
import { type BankAccount } from '@/hooks/useAccounts';

interface Transaction {
  merchant: string;
  date: string;
  amount: number;
}

interface Category {
  name: string;
  emoji: string;
  amount: number;
  transactions: Transaction[];
}

interface SpendingCategoriesProps {
  accounts?: BankAccount[];
}

const staticCategories: Category[] = [
  {
    name: 'מזון',
    emoji: '🍔',
    amount: 1240,
    transactions: [
      { merchant: "וולט (Wolt)", date: "18/05/2026", amount: 120 },
      { merchant: "מקדונלדס", date: "17/05/2026", amount: 65 },
      { merchant: "ג'ירף מסעדה", date: "15/05/2026", amount: 240 },
      { merchant: "פיצה האט", date: "12/05/2026", amount: 95 },
      { merchant: "וולט (Wolt)", date: "10/05/2026", amount: 180 },
      { merchant: "קפה לנדוור", date: "08/05/2026", amount: 80 },
      { merchant: "וולט (Wolt)", date: "05/05/2026", amount: 160 },
      { merchant: "ארומה אספרסו", date: "03/05/2026", amount: 40 },
      { merchant: "וולט (Wolt)", date: "02/05/2026", amount: 140 },
      { merchant: "קופיקס", date: "01/05/2026", amount: 12 },
      { merchant: "וולט (Wolt)", date: "01/05/2026", amount: 108 },
    ],
  },
  {
    name: 'ביגוד',
    emoji: '👗',
    amount: 640,
    transactions: [
      { merchant: "זארה (Zara)", date: "14/05/2026", amount: 320 },
      { merchant: "H&M", date: "11/05/2026", amount: 180 },
      { merchant: "אסוס (ASOS)", date: "06/05/2026", amount: 140 },
    ],
  },
  {
    name: 'בידור',
    emoji: '🎬',
    amount: 280,
    transactions: [
      { merchant: "סינמה סיטי", date: "16/05/2026", amount: 90 },
      { merchant: "נטפליקס", date: "15/05/2026", amount: 70 },
      { merchant: "בר קוקטיילים", date: "09/05/2026", amount: 120 },
    ],
  },
  {
    name: 'דלק/תחבורה',
    emoji: '⛽',
    amount: 420,
    transactions: [
      { merchant: "פז תחנת דלק", date: "16/05/2026", amount: 210 },
      { merchant: "רכבת ישראל", date: "14/05/2026", amount: 30 },
      { merchant: "סונול", date: "02/05/2026", amount: 180 },
    ],
  },
  {
    name: 'סופר',
    emoji: '🛒',
    amount: 890,
    transactions: [
      { merchant: "שופרסל דיל", date: "16/05/2026", amount: 450 },
      { merchant: "רמי לוי", date: "10/05/2026", amount: 320 },
      { merchant: "טיב טעם", date: "03/05/2026", amount: 120 },
    ],
  },
  {
    name: 'מנויים',
    emoji: '📱',
    amount: 180,
    transactions: [
      { merchant: "ספוטיפיי", date: "15/05/2026", amount: 40 },
      { merchant: "אפל מיוזיק", date: "12/05/2026", amount: 30 },
      { merchant: "הוסטרינג דומיין", date: "04/05/2026", amount: 110 },
    ],
  },
];

const categoryEmojis: Record<string, string> = {
  'מזון': '🍔',
  'ביגוד': '👗',
  'בידור': '🎬',
  'דלק/תחבורה': '⛽',
  'סופר': '🛒',
  'מנויים': '📱',
};

function categorizeTransaction(description: string): string | null {
  const desc = description.toLowerCase();
  if (
    desc.includes('וולט') ||
    desc.includes('wolt') ||
    desc.includes('מסעדה') ||
    desc.includes('מקדונלד') ||
    desc.includes('קפה') ||
    desc.includes('ארומה') ||
    desc.includes('קופיקס') ||
    desc.includes('אוכל') ||
    desc.includes('פיצה')
  ) {
    return 'מזון';
  }
  if (
    desc.includes('זארה') ||
    desc.includes('zara') ||
    desc.includes('h&m') ||
    desc.includes('אסוס') ||
    desc.includes('asos') ||
    desc.includes('ביגוד') ||
    desc.includes('בגדים') ||
    desc.includes('נעליים')
  ) {
    return 'ביגוד';
  }
  if (
    desc.includes('סינמה') ||
    desc.includes('נטפליקס') ||
    desc.includes('netflix') ||
    desc.includes('בר ') ||
    desc.includes('הופעה') ||
    desc.includes('סרט') ||
    desc.includes('בידור') ||
    desc.includes('קולנוע')
  ) {
    return 'בידור';
  }
  if (
    desc.includes('פז') ||
    desc.includes('סונול') ||
    desc.includes('דלק') ||
    desc.includes('רכבת') ||
    desc.includes('אוטובוס') ||
    desc.includes('מונית') ||
    desc.includes('גט') ||
    desc.includes('gett') ||
    desc.includes('תחבורה')
  ) {
    return 'דלק/תחבורה';
  }
  if (
    desc.includes('שופרסל') ||
    desc.includes('רמי לוי') ||
    desc.includes('טיב טעם') ||
    desc.includes('סופר') ||
    desc.includes('מכולת') ||
    desc.includes('יוחננוף') ||
    desc.includes('חצי חינם') ||
    desc.includes('ויקטורי')
  ) {
    return 'סופר';
  }
  if (
    desc.includes('ספוטיפיי') ||
    desc.includes('spotify') ||
    desc.includes('אפל') ||
    desc.includes('apple') ||
    desc.includes('מנוי') ||
    desc.includes('אינטרנט') ||
    desc.includes('טלפון') ||
    desc.includes('הוסט') ||
    desc.includes('domain')
  ) {
    return 'מנויים';
  }
  return null;
}

function getCleanDescription(description: string, memo?: string): string | null {
  const desc = description || '';
  const mem = memo || '';

  const genericNames = [
    'דירקט',
    'דירקט מצטבר',
    'עברה',
    'העברה נכנסת',
    'העברה',
    'הוראת קבע',
    'חיוב כרטיס',
    'חיוב כרטיס אשראי',
    'מזומן',
    'הפקדה',
    'משיכה',
    'עמלה',
    'עמלת',
    'bit',
    'ביט',
    'paybox',
    'פייבוקס',
    'העברת כסף',
  ];
  
  const isDescGeneric = genericNames.some(g => desc.trim() === g || desc.toLowerCase().includes(g.toLowerCase()));

  if (isDescGeneric) {
    if (mem.trim()) {
      const isMemGeneric = genericNames.some(g => mem.trim() === g || mem.toLowerCase().includes(g.toLowerCase()));
      if (!isMemGeneric) {
        return mem.trim();
      }
    }
    // If both are generic or no memo, it is a generic transaction -> return null to hide it
    return null;
  }

  return desc || mem || null;
}

export function SpendingCategories({ accounts = [] }: SpendingCategoriesProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const isCreditCardCompany = (bankId: string) => {
    const norm = bankId.toLowerCase();
    return norm === 'max' || norm === 'isracard';
  };

  const allTransactions = accounts.flatMap((acc) =>
    (acc.transactions || []).map((t) => ({ ...t, bankId: acc.bankId }))
  );
  
  // Decide whether to use real synced accounts or fallback previews
  const hasConnectedAccounts = accounts.length > 0;

  // 1. Calculate Live Totals
  // Bank income: positive transactions that have a non-generic identifiable description
  // (generic bank credits like credit-card billing debits, Bit transfers, etc. are excluded)
  const bankIncomeTxns = allTransactions.filter(
    (t) =>
      t.chargedAmount > 0 &&
      !isCreditCardCompany(t.bankId) &&
      !!getCleanDescription(t.description, t.memo)
  );
  // Credit card income: positive transactions from credit card companies (refunds, cashback)
  const creditCardIncomeTxns = allTransactions.filter(
    (t) => t.chargedAmount > 0 && isCreditCardCompany(t.bankId)
  );
  const liveEarned = [...bankIncomeTxns, ...creditCardIncomeTxns].reduce(
    (sum, t) => sum + t.chargedAmount,
    0
  );

  const liveSpent = Math.abs(
    allTransactions
      .filter((t) => t.chargedAmount < 0 && isCreditCardCompany(t.bankId))
      .reduce((sum, t) => sum + t.chargedAmount, 0)
  );

  // 2. Classify Live Transactions
  const categorizedTxnsMap: Record<string, { merchant: string; date: string; amount: number }[]> = {
    'מזון': [],
    'ביגוד': [],
    'בידור': [],
    'דלק/תחבורה': [],
    'סופר': [],
    'מנויים': [],
  };

  if (hasConnectedAccounts) {
    const expenseTxns = allTransactions.filter((t) => t.chargedAmount < 0 && isCreditCardCompany(t.bankId));
    expenseTxns.forEach((txn) => {
      const merchantName = getCleanDescription(txn.description, txn.memo);
      if (!merchantName) return; // Skip/hide generic transactions!

      const cat = categorizeTransaction(merchantName);
      if (!cat) return; // Skip transactions that do not match any specific category (e.g. no "other" allowed)

      const dateFormatted = txn.date ? new Date(txn.date).toLocaleDateString('he-IL') : '';
      categorizedTxnsMap[cat].push({
        merchant: merchantName,
        date: dateFormatted,
        amount: Math.abs(txn.chargedAmount),
      });
    });
  }

  const liveCategories: Category[] = Object.keys(categorizedTxnsMap)
    .map((name) => {
      const txns = categorizedTxnsMap[name];
      const amount = txns.reduce((sum, t) => sum + t.amount, 0);
      return {
        name,
        emoji: categoryEmojis[name] || '📦',
        amount,
        transactions: txns,
      };
    })
    .filter((c) => c.amount > 0);

  // Fallbacks
  const displayEarned = hasConnectedAccounts ? liveEarned : 14200;
  const displaySpent = hasConnectedAccounts ? liveSpent : 3650;
  const displayCategories = hasConnectedAccounts ? liveCategories : staticCategories;

  return (
    <PremiumCard className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-black text-zinc-950 dark:text-white">סיכום פיננסי חודשי</h2>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {hasConnectedAccounts
            ? 'מחושב מתוך נתוני הסנכרון החיים של חשבונות הבנק שלך'
            : 'תצוגה מקדימה - סנכרן חשבון בנק כדי לראות נתונים חיים'}
        </p>
      </div>

      {/* Financial Indicators Row */}
      <div dir='ltr' className="grid grid-cols-2 gap-4">
        <div className="border border-zinc-100 dark:border-zinc-800 bg-emerald-50/20 dark:bg-emerald-950/10 p-4 space-y-1.5 rounded-none text-right">
          <div className="flex items-center gap-1.5 justify-end text-emerald-600 dark:text-emerald-500">
            <span className="text-[11px] font-black">הכנסות החודש</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            +{displayEarned.toLocaleString('he-IL')} ₪
          </p>
        </div>

        <div className="border border-zinc-100 dark:border-zinc-800 bg-rose-50/20 dark:bg-rose-950/10 p-4 space-y-1.5 rounded-none text-right">
          <div className="flex items-center gap-1.5 justify-end text-rose-600 dark:text-rose-500">
            <span className="text-[11px] font-black">הוצאות החודש</span>
            <TrendingDown className="h-4 w-4" />
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400">
            -{displaySpent.toLocaleString('he-IL')} ₪
          </p>
        </div>
      </div>

      {/* Category Squares Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-right">
          התפלגות הוצאות לפי קטגוריות
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {displayCategories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category)}
              className="w-full aspect-square border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900/90 transition-all hover:scale-102 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center select-none rounded-none"
            >
              <span className="text-2xl">{category.emoji}</span>
              <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 leading-none">
                {category.name}
              </span>
              <span className="text-xs font-black text-rose-600 dark:text-rose-400 leading-none" dir="ltr">
                -{category.amount.toLocaleString()} ₪
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Transactions Dialog */}
      {selectedCategory && (
        <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none" dir='rtl' showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="text-base font-black text-zinc-950 dark:text-white flex items-center gap-2">
                <span>תנועות בקטגוריית {selectedCategory.name}</span>
                <span>{selectedCategory.emoji}</span>
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                סה"כ הוצאות בקטגוריה זו: {selectedCategory.amount.toLocaleString()} ₪
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable list of transactions */}
            <div className="py-4 space-y-2 max-h-80 overflow-y-auto pr-1">
              {selectedCategory.transactions.length === 0 ? (
                <p className="text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500 py-6">
                  אין תנועות זמינות בקטגוריה זו
                </p>
              ) : (
                selectedCategory.transactions.map((txn, index) => (
                  <div
                    key={index}
                    className="border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 px-3 py-2 flex items-center justify-between"
                  >
                    <div className="text-right">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {txn.merchant}
                      </p>
                      <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                        {txn.date}
                      </p>
                    </div>
                    <p className="text-xs font-black text-rose-600 dark:text-rose-400" dir="ltr">
                      -{txn.amount.toLocaleString()} ₪
                    </p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PremiumCard>
  );
}
