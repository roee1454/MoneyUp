/**
 * Minimum OTP length required to enable the submit button.
 * Set to 3 to support all known bank providers (some send 4–5 digit codes).
 */
export const OTP_MIN_LENGTH = 3;

/**
 * Maximum OTP length allowed in the input field.
 * Set to 8 as a reasonable upper bound across all providers.
 */
export const OTP_MAX_LENGTH = 8;

/** Sync progress step definitions displayed during the connection flow. */
export const SYNC_STEPS = [
  { key: 'logging_in', label: 'התחברות מאובטחת למוסד הפיננסי' },
  { key: 'logged_in', label: 'אימות והתחברות מוצלחים' },
  { key: 'scanning_transactions', label: 'סריקת עסקאות מ90 הימים האחרונים' },
  { key: 'finalizing', label: 'סיום סינכרון' },
] as const;

/** Ordered step keys used for progress tracking comparisons. */
export const SYNC_STEP_KEYS = SYNC_STEPS.map((s) => s.key);

/**
 * Maps login field identifiers returned by the scraper API
 * to Hebrew display labels and input types.
 */
export const LOGIN_FIELD_LABELS: Record<
  string,
  { label: string; type: string }
> = {
  username: { label: 'קוד משתמש', type: 'text' },
  userCode: { label: 'קוד משתמש', type: 'text' },
  password: { label: 'סיסמה', type: 'password' },
  id: { label: 'תעודת זהות', type: 'text' },
  nationalId: { label: 'תעודת זהות', type: 'text' },
  nationalID: { label: 'תעודת זהות', type: 'text' },
  card6Digits: { label: '6 ספרות אחרונות של הכרטיס', type: 'text' },
  accountNumber: { label: 'מספר חשבון', type: 'text' },
};


export const BROWSER_RECOMMENDATION_BANKS = ['cal', 'max', 'leumi', 'visacal', "yahav"]