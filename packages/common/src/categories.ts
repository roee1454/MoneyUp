export interface CategoryMetadata {
  id: string;
  name: string;
  translation: string;
  examples: string[];
  icon: string;
}

export const SHARED_CATEGORIES: CategoryMetadata[] = [
  {
    id: 'diur',
    name: 'דיור',
    translation: 'diur',
    examples: ['שכירות', 'ארנונה', 'ועד בית'],
    icon: '🏠',
  },
  {
    id: 'mazon',
    name: 'מזון',
    translation: 'mazon',
    examples: ['שופרסל', 'רמי לוי', 'ויקטורי'],
    icon: '🛒',
  },
  {
    id: 'tahaburah',
    name: 'תחבורה',
    translation: 'tahaburah',
    examples: ['רב-קו', 'דלק', 'Gett'],
    icon: '🚗',
  },
  {
    id: 'shartuim',
    name: 'שירותים',
    translation: 'shartuim',
    examples: ['חברת חשמל', 'מקורות', 'בזק'],
    icon: '💡',
  },
  {
    id: 'briut',
    name: 'בריאות',
    translation: 'briut',
    examples: ['קופת חולים', 'בית מרקחת'],
    icon: '🏥',
  },
  {
    id: 'chinuch',
    name: 'חינוך',
    translation: 'chinuch',
    examples: ['גן', 'בית ספר', 'קורסים'],
    icon: '🎓',
  },
  {
    id: 'bilui',
    name: 'בילוי',
    translation: 'bilui',
    examples: ['מסעדות', 'קולנוע', 'סטרימינג'],
    icon: '🍿',
  },
  {
    id: 'bituach',
    name: 'ביטוח',
    translation: 'bituach',
    examples: ['בריאות', 'רכב', 'דירה'],
    icon: '🛡️',
  },
  {
    id: 'chisachon',
    name: 'חיסכון',
    translation: 'chisachon',
    examples: ['פנסיה', 'קרן השתלמות'],
    icon: '💰',
  },
  {
    id: 'la_mesuvag',
    name: 'לא מסווג',
    translation: 'la_mesuvag',
    examples: [],
    icon: '📦',
  },
];

export const EXPENSE_CATEGORIES = [
  'דיור',
  'מזון',
  'תחבורה',
  'שירותים',
  'בריאות',
  'חינוך',
  'בילוי',
  'ביטוח',
  'חיסכון',
  'לא מסווג',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const CATEGORY_EMOJIS: Record<ExpenseCategory, string> = {
  דיור: '🏠',
  מזון: '🛒',
  תחבורה: '🚗',
  שירותים: '💡',
  בריאות: '🏥',
  חינוך: '🎓',
  בילוי: '🍿',
  ביטוח: '🛡️',
  חיסכון: '💰',
  'לא מסווג': '📦',
};

export const CATEGORY_TRANSLATIONS: Record<ExpenseCategory, string> = {
  דיור: 'diur',
  מזון: 'mazon',
  תחבורה: 'tahaburah',
  שירותים: 'shartuim',
  בריאות: 'briut',
  חינוך: 'chinuch',
  בילוי: 'bilui',
  ביטוח: 'bituach',
  חיסכון: 'chisachon',
  'לא מסווג': 'la_mesuvag',
};

export const CATEGORY_EXAMPLES: Record<ExpenseCategory, string[]> = {
  דיור: ['שכירות', 'ארנונה', 'ועד בית'],
  מזון: ['שופרסל', 'רמי לוי', 'ויקטורי'],
  תחבורה: ['רב-קו', 'דלק', 'Gett'],
  שירותים: ['חברת חשמל', 'מקורות', 'בזק'],
  בריאות: ['קופת חולים', 'בית מרקחת'],
  חינוך: ['גן', 'בית ספר', 'קורסים'],
  בילוי: ['מסעדות', 'קולנוע', 'סטרימינג'],
  ביטוח: ['בריאות', 'רכב', 'דירה'],
  חיסכון: ['פנסיה', 'קרן השתלמות'],
  'לא מסווג': [],
};