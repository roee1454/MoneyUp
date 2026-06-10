import { EXPENSE_CATEGORIES } from './categories';

export const AI_TOOLS = [
  {
    name: 'list_connected_accounts',
    description:
      'List all bank and credit-card accounts connected by the user, including their bankId, accountNumber, last4 digits, and current balance. ' +
      'Call this tool whenever the user asks: which accounts do you have access to, what cards/banks are connected, what is my account list, etc. ' +
      'Also call this FIRST when the user mentions a specific bank, card, or card ending in specific digits (e.g. "MAX", "Leumi", "card ending in 9511") so you can resolve the correct bankId and accountNumber before querying transactions. ' +
      'The response includes a "last4" field (last 4 digits of the account/card number) to help match user references like "card ending in 9511".',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_spending_summary',
    description:
      'Get high-level spending totals (Income, Expenses, Balance) and category breakdowns for a specific date range. Use this as a first step to understand general patterns.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        endDate: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'find_merchants_by_topic',
    description:
      'Map a topic, activity, or English concept (e.g., "snooker", "gym", "groceries") to exact merchant names found in the database. Returns a list of real business names.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic or concept to find business names for.',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'query_transactions',
    description:
      'Get exact totals and a detailed transaction list. Can filter by specific merchant names AND/OR a specific bank/card (bankId). ' +
      'Use list_connected_accounts first to resolve the correct bankId when the user refers to a specific bank or card. ' +
      'Use find_merchants_by_topic first when the user asks about a topic/concept to get merchant names. ' +
      'merchantNames is optional — omit it to get ALL transactions for the specified account(s).',
    parameters: {
      type: 'object',
      properties: {
        merchantNames: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional list of EXACT merchant names to filter by. Leave empty to get all transactions.',
        },
        bankId: {
          type: 'string',
          description:
            'Optional. Filter transactions to a specific bank or credit card by its bankId (e.g. "max", "leumi", "hapoalim"). Obtain the exact bankId from list_connected_accounts.',
        },
        accountNumber: {
          type: 'string',
          description:
            'Optional. Further narrow to a specific account number within the bank. Obtain from list_connected_accounts.',
        },
        startDate: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        endDate: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
        last4: {
          type: 'string',
          description:
            'Optional. Filter to an account/card whose last 4 digits match this value (e.g. "9511"). Use this when the user says "card ending in 9511". Obtain confirmed last4 values from list_connected_accounts.',
        },
        type: {
          type: 'string',
          enum: ['expense', 'income', 'all'],
          description:
            'Optional. Filter transactions by type: "expense" (negative charges/payments), "income" (positive deposits/transfers/salary), or "all" (both). Default is "all".',
        },
        limit: {
          type: 'number',
          description: 'Max transactions to return (default 50)',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'bank_id_mapper',
    description:
      'Returns a mapping of bankId (e.g. hapoalim, max, isracard, cal, leumi, pepper, yahav) to their Hebrew display names, allowing you to correctly match user queries about specific banks/cards to their technical bankId.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'classify_merchants_with_ai',
    description:
      'Classify a list of unknown/unresolved merchants into specific categories using AI. Returns the classified category and confidence score for each merchant.',
    parameters: {
      type: 'object',
      properties: {
        unresolved: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              normalizedMerchant: { type: 'string' },
              displayMerchant: { type: 'string' },
            },
            required: ['normalizedMerchant', 'displayMerchant'],
          },
          description: 'List of unresolved merchants to classify',
        },
      },
      required: ['unresolved'],
    },
  },
  {
    name: 'search_web',
    description:
      'Search the web for real-time information, news, and financial data. ' +
      'Use this tool when the user asks for financial instruments by description (e.g., "Israeli S&P 500 fund with low fees") ' +
      'to find the exact ticker or fund number BEFORE calling get_technical_analysis.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query. For Israeli funds, use Hebrew terms like "קרן השתלמות מחקה מדד S&P 500 דמי ניהול נמוכים".',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_webpage',
    description:
      'Reads the text content of a webpage given its URL. Use this after calling search_web to read the full content of relevant articles or search results to extract exact ETF/fund names or tickers.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the webpage to read.',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'render_investment_simulator',
    description: 'Renders an interactive compound interest and tax-drag simulator for the user. Call this when comparing ETFs or long-term tax effects (like CSPX vs VOO) so the user can visually see the difference over 30 years.',
    parameters: {
      type: 'object',
      properties: {
        assetA: { type: 'string', description: 'Name of the first asset (e.g., CSPX)' },
        assetB: { type: 'string', description: 'Name of the second asset (e.g., VOO)' },
        taxRateA: { type: 'number', description: 'Tax drag percentage for Asset A (e.g., 0.15 for 15% dividend tax)' },
        taxRateB: { type: 'number', description: 'Tax drag percentage for Asset B (e.g., 0.25 for 25% dividend tax)' },
        terA: { type: 'number', description: 'Total Expense Ratio for Asset A (e.g., 0.07)' },
        terB: { type: 'number', description: 'Total Expense Ratio for Asset B (e.g., 0.03)' },
        isAccumulatingA: { type: 'boolean', description: 'True if Asset A is an accumulating fund (reinvests dividends internally without Israeli tax event until sale)' },
        isAccumulatingB: { type: 'boolean', description: 'True if Asset B is an accumulating fund (reinvests dividends internally without Israeli tax event until sale)' },
        currency: {
          type: 'string',
          enum: ['USD', 'ILS'],
          description: 'The currency for comparison. Use "USD" for American/international stocks or ETFs (like CSPX, VOO), or "ILS" for local Israeli assets. Default is "USD" if talking about US/international investments.'
        },
      },
      required: ['assetA', 'assetB', 'taxRateA', 'taxRateB', 'terA', 'terB', 'isAccumulatingA', 'isAccumulatingB'],
    },
  },
  {
    name: 'get_portfolio',
    description:
      'Fetches the user\'s broker portfolio data (Interactive IL), including current balance, earnings/losses, total return, and current investment positions. Use this to understand the user\'s current investments before giving financial advice.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_technical_analysis',
    description:
      'Fetches TradingView Technical Analysis data for a specific stock/ticker (e.g., AAPL, MSFT) including Buy/Sell signals, Oscillators, and Moving Averages. Use this market data to make informed recommendations.',
    parameters: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description: 'The stock ticker symbol (e.g. AAPL)',
        },
        exchange: {
          type: 'string',
          description: 'The exchange symbol (e.g. NASDAQ). Optional, defaults to NASDAQ.',
        },
      },
      required: ['ticker'],
    },
  },
];

export const MERCHANT_CATEGORIZATION_RULES = [
  'You are an Israeli consumer transaction classification expert.',
  'Your task is to classify Israeli & international merchant names into exactly ONE of the allowed Hebrew categories AND provide 3-5 descriptive English/Hebrew keywords.',
  '',
  'Allowed Hebrew Categories:',
  `- ${EXPENSE_CATEGORIES[0]} (Leisure, dining, restaurants, cafes, fast food, coffee shops, Wolt, Ten Bis, bars, pubs, entertainment, cinemas, concert tickets, bowling, attractions, parties, and nightlife events)`,
  `- ${EXPENSE_CATEGORIES[1]} (Supermarkets, groceries, online shopping, clothing, fashion, electronics, KSP, Ivory, Amazon, AliExpress)`,
  `- ${EXPENSE_CATEGORIES[2]} (Gas stations, Pango, Cello, public transit, taxis)`,
  `- ${EXPENSE_CATEGORIES[3]} (Recurring services, Netflix, Spotify, cellular, iCloud)`,
  '',
  'Instructions:',
  '1. The "category" field in your output JSON must match EXACTLY one of the allowed Hebrew categories listed above. Do not translate them to English.',
  `2. Do NOT use "${EXPENSE_CATEGORIES[4]}" (Unclassified) under any circumstances. You must classify every single merchant into one of the other 4 categories. If you are unsure, make your best educated guess based on the merchant name and typical consumer spending behavior.`,
  '3. Return ONLY a valid JSON array of objects. Do NOT include markdown code blocks (e.g. ```json) or any explanations.',
  '',
  'Example Input:',
  '[{"normalizedMerchant":"wolt","displayMerchant":"Wolt"},{"normalizedMerchant":"zara","displayMerchant":"ZARA"}]',
  '',
  'Example Output:',
  '[',
  '  {',
  '    "normalizedMerchant": "wolt",',
  `    "category": "${EXPENSE_CATEGORIES[0]}",`,
  '    "keywords": "food delivery, restaurants, fast food",',
  '    "confidence": 0.95',
  '  },',
  '  {',
  '    "normalizedMerchant": "zara",',
  `    "category": "${EXPENSE_CATEGORIES[1]}",`,
  '    "keywords": "clothing, fashion, apparel, shopping",',
  '    "confidence": 0.90',
  '  }',
  ']',
].join('\n');

