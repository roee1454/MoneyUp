export type PublicScraperErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'CHALLENGE_FAILED'
  | 'BANK_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  | 'AUTOMATION_BLOCKED'
  | 'UNKNOWN_CONNECT_ERROR';

/**
 * Normalizes raw scraping error messages into clean, public-facing codes and descriptions.
 *
 * @param rawError Raw error message or stack trace.
 * @returns Object containing error code and translated Hebrew message.
 */
export function normalizeScraperError(rawError?: string): {
  code: PublicScraperErrorCode;
  message: string;
} {
  const text = (rawError || '').toLowerCase();

  if (
    text.includes('invalid_credentials') ||
    text.includes('invalid credentials') ||
    text.includes('wrong password') ||
    text.includes('שם משתמש או סיסמה') ||
    text.includes('usercode') ||
    text.includes('password') ||
    text.includes('פרטים שגויים')
  ) {
    return buildSanitizedError('INVALID_CREDENTIALS');
  }

  if (
    text.includes('otp') ||
    text.includes('challenge') ||
    text.includes('sms code') ||
    text.includes('קוד אימות')
  ) {
    return buildSanitizedError('CHALLENGE_FAILED');
  }

  if (
    text.includes('automationblockederror') ||
    text.includes('block automation') ||
    text.includes('cloudflare') ||
    text.includes('waf') ||
    text.includes('sorry, you have been blocked') ||
    text.includes('access denied') ||
    text.includes('מזיהוי אוטומטי')
  ) {
    return buildSanitizedError('AUTOMATION_BLOCKED');
  }

  if (
    text.includes('timeout') ||
    text.includes('econnreset') ||
    text.includes('enotfound') ||
    text.includes('navigation') ||
    text.includes('bank unavailable')
  ) {
    return buildSanitizedError('BANK_UNAVAILABLE');
  }

  return buildSanitizedError('UNKNOWN_CONNECT_ERROR');
}

/**
 * Builds standard translated error responses for specific error codes.
 *
 * @param code PublicScraperErrorCode identifier.
 * @returns Object with code and Hebrew message.
 */
export function buildSanitizedError(code: PublicScraperErrorCode): {
  code: PublicScraperErrorCode;
  message: string;
} {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return { code, message: 'שם משתמש או סיסמה אינם נכונים' };
    case 'CHALLENGE_FAILED':
      return { code, message: 'קוד האימות שגוי' };
    case 'AUTOMATION_BLOCKED':
      return {
        code,
        message:
          'החיבור נחסם זמנית על ידי מערכות האבטחה של המוסד הפיננסי (חסימת WAF). אנא המתן 15–30 דקות ונסה שוב, או הפעל "הצגת דפדפן" בהגדרות.',
      };
    case 'BANK_UNAVAILABLE':
      return {
        code,
        message: 'שירות הבנק לא זמין כרגע. נסה שוב בעוד כמה דקות.',
      };
    case 'SESSION_EXPIRED':
      return { code, message: 'פג תוקף הסשן. התחל מחדש את תהליך החיבור.' };
    default:
      return {
        code: 'UNKNOWN_CONNECT_ERROR',
        message: 'ההתחברות נכשלה. נסה שוב.',
      };
  }
}
