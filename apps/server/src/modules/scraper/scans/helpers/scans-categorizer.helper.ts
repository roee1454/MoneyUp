import { EXPENSE_CATEGORIES } from '@money-up/common';
import { UnifiedTransaction } from '@money-up/types';

/**
 * Validates if a string is a registered expense category.
 *
 * @param value Raw category value
 * @returns boolean
 */
export function isValidCategory(
  value: string,
): value is (typeof EXPENSE_CATEGORIES)[number] {
  return EXPENSE_CATEGORIES.includes(
    value as (typeof EXPENSE_CATEGORIES)[number],
  );
}

/**
 * Deterministically categorizes an expense description using keyword rules.
 *
 * @param description Raw or cleaned merchant description
 * @returns Category key or null
 */
export function categorizeExpense(
  description: string,
): Exclude<(typeof EXPENSE_CATEGORIES)[number], 'לא מסווג'> | null {
  const desc = description.toLowerCase();

  // 1. דיור (Housing)
  if (
    desc.includes('שכירות') ||
    desc.includes('ארנונה') ||
    desc.includes('ועד בית') ||
    desc.includes('משכנתא')
  ) {
    return 'דיור';
  }

  // 2. מזון (Food)
  if (
    desc.includes('שופרסל') ||
    desc.includes('רמי לוי') ||
    desc.includes('ויקטורי') ||
    desc.includes('סופר') ||
    desc.includes('מכולת') ||
    desc.includes('מרקט') ||
    desc.includes('יוחננוף') ||
    desc.includes('חצי חינם') ||
    desc.includes('טיב טעם') ||
    desc.includes('supermarket') ||
    desc.includes('groceries') ||
    desc.includes('grocery')
  ) {
    return 'מזון';
  }

  // 3. תחבורה (Transportation)
  if (
    desc.includes('רב-קו') ||
    desc.includes('רב קו') ||
    desc.includes('דלק') ||
    desc.includes('gett') ||
    desc.includes('גט ') ||
    desc.includes('מונית') ||
    desc.includes('רכבת') ||
    desc.includes('אוטובוס') ||
    desc.includes('פז') ||
    desc.includes('סונול') ||
    desc.includes('דור אלון') ||
    desc.includes('delek') ||
    desc.includes('פנגו') ||
    desc.includes('pango') ||
    desc.includes('סלופארק') ||
    desc.includes('parking') ||
    desc.includes('חניה') ||
    desc.includes('נסיעה')
  ) {
    return 'תחבורה';
  }

  // 4. שירותים (Utilities & Services)
  if (
    desc.includes('חשמל') ||
    desc.includes('מקורות') ||
    desc.includes('בזק') ||
    desc.includes('סלקום') ||
    desc.includes('פרטנר') ||
    desc.includes('הוט') ||
    desc.includes('cellcom') ||
    desc.includes('partner') ||
    desc.includes('hot') ||
    desc.includes('אינטרנט') ||
    desc.includes('גז') ||
    desc.includes('תקשורת') ||
    desc.includes('מנוי') ||
    desc.includes('icloud') ||
    desc.includes('domain') ||
    desc.includes('הוסט')
  ) {
    return 'שירותים';
  }

  // 5. בריאות (Health)
  if (
    desc.includes('קופת חולים') ||
    desc.includes('בית מרקחת') ||
    desc.includes('כללית') ||
    desc.includes('מכבי') ||
    desc.includes('מאוחדת') ||
    desc.includes('לאומית') ||
    desc.includes('סופר פארם') ||
    desc.includes('סופר-פארם') ||
    desc.includes('pharm') ||
    desc.includes('מרפאה') ||
    desc.includes('רופא') ||
    desc.includes('פארם') ||
    desc.includes('בריאות') ||
    desc.includes('תרופה')
  ) {
    return 'בריאות';
  }

  // 6. חינוך (Education)
  if (
    desc.includes('גן') ||
    desc.includes('בית ספר') ||
    desc.includes('קורס') ||
    desc.includes('אוניברסיטה') ||
    desc.includes('מכללה') ||
    desc.includes('חוג') ||
    desc.includes('שכר לימוד') ||
    desc.includes('שיעור') ||
    desc.includes('לימודים')
  ) {
    return 'חינוך';
  }

  // 7. בילוי (Leisure & Entertainment)
  if (
    desc.includes('וולט') ||
    desc.includes('wolt') ||
    desc.includes('תן ביס') ||
    desc.includes('ten bis') ||
    desc.includes('מסעדה') ||
    desc.includes('קפה') ||
    desc.includes('בר ') ||
    desc.includes('פאב') ||
    desc.includes('קולנוע') ||
    desc.includes('סרט') ||
    desc.includes('הופעה') ||
    desc.includes('מסיבה') ||
    desc.includes('נטפליקס') ||
    desc.includes('netflix') ||
    desc.includes('ספוטיפיי') ||
    desc.includes('spotify') ||
    desc.includes('אוכל') ||
    desc.includes('פיצה') ||
    desc.includes('ארומה') ||
    desc.includes('קופיקס') ||
    desc.includes('מקדונלד') ||
    desc.includes('בידור') ||
    desc.includes('מועדון') ||
    desc.includes('אטרקציה') ||
    desc.includes('חדר בריחה') ||
    desc.includes('סטרימינג')
  ) {
    return 'בילוי';
  }

  // 8. ביטוח (Insurance)
  if (
    desc.includes('ביטוח') ||
    desc.includes('הראל') ||
    desc.includes('מגדל') ||
    desc.includes('פניקס') ||
    desc.includes('מנורה') ||
    desc.includes('כלל') ||
    desc.includes('איילון') ||
    desc.includes('ישיר') ||
    desc.includes('insurance')
  ) {
    return 'ביטוח';
  }

  // 9. חיסכון (Savings)
  if (
    desc.includes('פנסיה') ||
    desc.includes('קרן השתלמות') ||
    desc.includes('קופת גמל') ||
    desc.includes('חיסכון') ||
    desc.includes('השקעה') ||
    desc.includes('pension') ||
    desc.includes('גמל')
  ) {
    return 'חיסכון';
  }

  return null;
}

/**
 * Infers contextual tags for a transaction description.
 *
 * @param description Cleaned merchant description
 * @param amount Absolute transaction amount
 * @param txns List of all transactions in account context
 * @returns Array of tags
 */
export function inferTags(
  description: string,
  amount: number,
  txns: UnifiedTransaction[],
): string[] {
  const tags: string[] = [];
  const lower = description.toLowerCase();
  if (
    lower.includes('spotify') ||
    lower.includes('netflix') ||
    lower.includes('apple') ||
    lower.includes('מנוי')
  ) {
    tags.push('subscription_candidate');
  }
  const similarCount = txns.filter((txn) =>
    (txn.description || '').toLowerCase().includes(lower.slice(0, 10)),
  ).length;
  if (similarCount >= 2) tags.push('recurring');
  if (amount >= 2000) tags.push('anomaly');
  return tags;
}
