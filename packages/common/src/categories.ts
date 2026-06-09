export const EXPENSE_CATEGORIES = [
  "מותרות",
  'קניות בסופר',
  'דלק/תחבורה',
  'מנויים',
  'לא מסווג',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];