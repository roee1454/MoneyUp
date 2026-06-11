export function getFriendlyErrorMessage(errorInput: any): string {
  if (!errorInput) return '';

  let errStr = '';
  if (typeof errorInput === 'string') {
    errStr = errorInput;
  } else if (errorInput instanceof Error) {
    errStr = errorInput.message;
  } else if (typeof errorInput === 'object') {
    errStr = errorInput.message || JSON.stringify(errorInput);
  }

  const lowerStr = errStr.toLowerCase();

  // --- OLLAMA / LOCAL CONNECTION ERRORS ---
  if (
    lowerStr.includes('failed to fetch') ||
    lowerStr.includes('connection refused') ||
    lowerStr.includes('network error')
  ) {
    if (lowerStr.includes('ollama')) {
      return 'לא ניתן להתחבר לשרת Ollama המקומי. ודא שהתוכנה פועלת במחשב שלך (פורט 11434).';
    }
    return 'שגיאת תקשורת: לא ניתן להתחבר לשרת. ודא שהשרת פועל ושיש חיבור אינטרנט תקין.';
  }

  // --- GEMINI SPECIFIC ERRORS ---
  if (lowerStr.includes('gemini')) {
    // 429 Resource Exhausted / Quota Limit
    if (
      lowerStr.includes('429') ||
      lowerStr.includes('resource_exhausted') ||
      lowerStr.includes('quota')
    ) {
      return 'נראה שחרגת ממכסת השימוש החינמית ב-Gemini. אנא נסה שוב מאוחר יותר או בחר מודל אחר (שגיאה 429 / RESOURCE_EXHAUSTED).';
    }
    // 503 Unavailable
    if (
      lowerStr.includes('503') ||
      lowerStr.includes('unavailable') ||
      lowerStr.includes('experiencing high demand')
    ) {
      return 'מודל Gemini אינו זמין כעת בשל עומס יתר. אנא נסה שוב בעוד מספר רגעים (שגיאה 503 / UNAVAILABLE).';
    }
    // 401 / 403 Forbidden / API Key
    if (
      lowerStr.includes('401') ||
      lowerStr.includes('403') ||
      lowerStr.includes('api key not valid') ||
      lowerStr.includes('api_key_invalid')
    ) {
      return 'שגיאת התחברות ל-Gemini. אנא ודא שמפתח ה-API תקין ומוגדר כראוי (שגיאה 401/403).';
    }
    // 400 Invalid Argument / Thought Signature
    if (lowerStr.includes('400') || lowerStr.includes('thought_signature')) {
      return 'בקשה לא תקינה ל-Gemini. אנא ודא שהגדרות המודל תקינות (שגיאה 400).';
    }
  }

  // --- CLAUDE (ANTHROPIC) SPECIFIC ERRORS ---
  if (lowerStr.includes('claude') || lowerStr.includes('anthropic')) {
    // 429 Too Many Requests
    if (lowerStr.includes('429') || lowerStr.includes('rate_limit')) {
      return 'חרגת מקצב הבקשות המותר ב-Claude. אנא המתן מספר שניות ונסה שוב (שגיאה 429).';
    }
    // 401 / 403 Invalid API Key / Forbidden / Billing
    if (
      lowerStr.includes('401') ||
      lowerStr.includes('invalid_api_key') ||
      lowerStr.includes('api_key_invalid')
    ) {
      return 'מפתח ה-API של Claude שהוזן אינו תקין. אנא בדוק את הגדרות החיבור (שגיאה 401).';
    }
    if (lowerStr.includes('403') || lowerStr.includes('credit_exhausted')) {
      return 'הגישה ל-Claude נחסמה. ייתכן ויתרת התשלום בחשבון Anthropic שלך הסתיימה (שגיאה 403).';
    }
    // 529 / 503 Service Overloaded
    if (
      lowerStr.includes('529') ||
      lowerStr.includes('503') ||
      lowerStr.includes('overloaded_error')
    ) {
      return 'שרתי Claude עמוסים כעת באופן זמני. אנא נסה שוב בעוד מספר רגעים (שגיאה 529/503).';
    }
  }

  // --- OPENAI SPECIFIC ERRORS ---
  if (lowerStr.includes('openai')) {
    // 429 Too Many Requests / Quota Exceeded
    if (
      lowerStr.includes('429') ||
      lowerStr.includes('insufficient_quota') ||
      lowerStr.includes('rate_limit')
    ) {
      return 'נראה שחרגת ממכסת השימוש או שיתרת התשלום בחשבון OpenAI שלך הסתיימה (שגיאה 429).';
    }
    // 401 Unauthorized / Invalid API Key
    if (
      lowerStr.includes('401') ||
      lowerStr.includes('invalid_api_key') ||
      lowerStr.includes('api_key_invalid')
    ) {
      return 'מפתח ה-API של OpenAI שהוזן אינו תקין. אנא בדוק את הגדרות החיבור (שגיאה 401).';
    }
    // 500 / 503 Internal Server Error
    if (
      lowerStr.includes('500') ||
      lowerStr.includes('503') ||
      lowerStr.includes('server_error')
    ) {
      return 'שרתי OpenAI חווים עומס כרגע או שאינם זמינים זמנית. אנא נסה שוב בעוד מספר רגעים (שגיאה 500/503).';
    }
    // 400 Context / Invalid
    if (lowerStr.includes('400')) {
      return 'בקשה לא תקינה ל-OpenAI. ייתכן וההודעה ארוכה מדי או שהמודל שנבחר אינו זמין (שגיאה 400).';
    }
  }

  // --- OPENROUTER SPECIFIC ERRORS ---
  if (lowerStr.includes('openrouter')) {
    if (lowerStr.includes('401') || lowerStr.includes('403')) {
      return 'שגיאת התחברות ל-OpenRouter. אנא ודא שמפתח ה-API תקין ושיש לך יתרה מספקת בחשבון.';
    }
    if (lowerStr.includes('429')) {
      return 'חרגת מקצב הבקשות ב-OpenRouter. אנא נסה שוב בעוד מספר רגעים (שגיאה 429).';
    }
    if (
      lowerStr.includes('502') ||
      lowerStr.includes('503') ||
      lowerStr.includes('upstream')
    ) {
      return 'ספק המודל ב-OpenRouter אינו זמין כעת. אנא נסה שוב מאוחר יותר או בחר מודל אחר (שגיאה 502/503).';
    }
  }

  // --- OLLAMA MODEL NOT FOUND ---
  if (lowerStr.includes('ollama') && lowerStr.includes('404')) {
    return 'מודל Ollama שנבחר לא נמצא. ודא שהרצת "ollama pull <model-name>" במחשב שלך (שגיאה 404).';
  }

  // --- GENERAL / GENERIC ERROR CODES ---
  if (lowerStr.includes('429')) {
    return 'חרגת מקצב הבקשות המותר. אנא המתן מספר רגעים ונסה שוב (שגיאה 429).';
  }
  if (lowerStr.includes('503') || lowerStr.includes('502')) {
    return 'השירות אינו זמין כעת בשל עומס זמני. אנא נסו שוב בעוד מספר רגעים (שגיאה 502/503).';
  }
  if (lowerStr.includes('401') || lowerStr.includes('403')) {
    return 'שגיאת הרשאה או מפתח API שגוי. אנא בדקו את הגדרות החיבור (שגיאה 401/403).';
  }

  // Clean up error message if it wraps a NestJS error or similar JSON
  let cleanMsg = errStr;
  const jsonMatch = errStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        cleanMsg = parsed.error.message;
      } else if (parsed.message) {
        cleanMsg = parsed.message;
      }
    } catch {
      // ignore parsing failure
    }
  }

  // Clean up standard prefixes
  cleanMsg = cleanMsg
    .replace(/^Error:\s*/i, '')
    .replace(/^[a-zA-Z]+ request failed \(\d+\):\s*/i, '')
    .replace(/^Streaming failed:\s*/i, '')
    .replace(/^Request failed:\s*/i, '');

  return cleanMsg || 'אירעה שגיאה בתקשורת עם השרת.';
}

export function getFriendlyScraperError(errorInput: any, errorCode?: string): string {
  if (errorCode === 'INVALID_CREDENTIALS') {
    return 'פרטי המשתמש אינם נכונים, אנא נסה שנית עם פרטים אחרים.';
  }
  if (errorCode === 'CHALLENGE_FAILED') {
    return 'הפרטים שהזנת אינם נכונים.';
  }
  if (errorCode === 'AUTOMATION_BLOCKED') {
    return 'החיבור נחסם זמנית על ידי מערכות האבטחה של המוסד הפיננסי (חסימת WAF / זיהוי בוטים). אנא המתן 15–30 דקות ונסה שוב, או הפעל "הצגת דפדפן" בהגדרות כדי לפתור זאת ידנית.';
  }
  if (errorCode === 'BANK_UNAVAILABLE') {
    return 'שירות חברת האשראי או הבנק לא זמין כרגע. נסה שוב בעוד כמה דקות.';
  }

  if (!errorInput) return 'החיבור חסום כרגע אצלך (ייתכן בשל זיהוי בוטים וסורקים) אנא נסה שוב בעוד מספר דקות.\nבנוסף מומלץ להדליק הצגת דפדפן בהגדרות סורקים כדי להבין איפה ההתחברות נכשלת.';

  let errStr = '';
  if (typeof errorInput === 'string') {
    errStr = errorInput;
  } else if (errorInput instanceof Error) {
    errStr = errorInput.message;
  } else if (typeof errorInput === 'object') {
    errStr = errorInput.message || JSON.stringify(errorInput);
  }

  const lowerStr = errStr.toLowerCase();
  if (
    lowerStr.includes('unexpected end of json') ||
    lowerStr.includes('block automation') ||
    lowerStr.includes('blocked by automation')
  ) {
    return 'החיבור חסום כרגע אצלך (ייתכן בשל זיהוי בוטים וסורקים) אנא נסה שוב בעוד מספר דקות.';
  }

  // Fallback to cleaner message if it contains "Unexpected end of JSON input" or similar
  return errStr || 'החיבור חסום כרגע אצלך (ייתכן בשל זיהוי בוטים וסורקים) אנא נסה שוב בעוד מספר דקות.\nבנוסף מומלץ להדליק הצגת דפדפן בהגדרות סורקים כדי להבין איפה ההתחברות נכשלת.';
}
