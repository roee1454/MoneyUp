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
];

