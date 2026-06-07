import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Observable, Subscriber } from 'rxjs';
import { UserAiConfig } from '../../types/gateway.types';
import { verifyJwtToken } from '../../utils/auth.utils';
import { ToolRegistry } from './tools/tool-registry';
import { AI_TOOLS } from '@money-up/common';
import { UsersService } from '../users/users.service';

import { AIProvider } from './providers/ai-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { ClaudeProvider } from './providers/claude-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { OllamaProvider } from './providers/ollama-provider';
import { OpenRouterProvider } from './providers/openrouter-provider';

type ProviderName = 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';

@Injectable()
export class AiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  getProvider(providerName: ProviderName, customApiKey?: string): AIProvider {
    let apiKey =
      customApiKey ||
      this.configService.get<string>(`${providerName.toUpperCase()}_API_KEY`);

    if (!apiKey && providerName === 'ollama') {
      apiKey = 'http://localhost:11434/v1';
    }

    if (!apiKey) {
      throw new InternalServerErrorException(
        `API Key for ${providerName} is not configured`,
      );
    }

    switch (providerName) {
      case 'openai':
        return new OpenAIProvider(apiKey);
      case 'claude':
        return new ClaudeProvider(apiKey);
      case 'gemini':
        return new GeminiProvider(apiKey);
      case 'ollama':
        return new OllamaProvider(apiKey);
      case 'openrouter':
        return new OpenRouterProvider(apiKey);
      default:
        throw new InternalServerErrorException(
          `Unsupported provider: ${providerName}`,
        );
    }
  }

  async promptNonStream(
    userId: string,
    resolved: any,
    conversationId?: string,
  ): Promise<{ text: string }> {
    let currentMessages = [...resolved.messages];
    let iteration = 0;

    const providerInstance = this.getProvider(resolved.provider, resolved.apiKey);

    while (iteration < 5) {
      iteration++;
      const response = (await providerInstance.prompt(resolved.model, currentMessages, {
        stream: false,
        temperature: resolved.temperature,
        maxTokens: resolved.maxTokens,
        tools: AI_TOOLS as any,
      })) as any;

      if (response.type === 'tool_calls') {
        const assistantMsg = {
          role: 'assistant' as const,
          content: response.content || '',
          tool_calls: response.tool_calls,
        };
        currentMessages.push(assistantMsg);

        if (conversationId) {
          await this.usersService.addMessage(
            userId,
            conversationId,
            assistantMsg.role,
            assistantMsg.content,
            assistantMsg.tool_calls,
          ).catch((e) => console.error('Failed to persist tool call', e));
        }

        for (const tc of response.tool_calls) {
          const result = await this.toolRegistry.run(tc.name, userId, tc.arguments);
          const toolResultMsg = {
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          };
          currentMessages.push(toolResultMsg);

          if (conversationId) {
            await this.usersService.addMessage(
              userId,
              conversationId,
              toolResultMsg.role,
              toolResultMsg.content,
              undefined,
              toolResultMsg.tool_call_id,
            ).catch((e) => console.error('Failed to persist tool result', e));
          }
        }
        continue;
      }

      if (conversationId && response.content) {
        await this.usersService.addMessage(
          userId,
          conversationId,
          'assistant',
          response.content,
        ).catch((e) =>
          console.error('Failed to persist final assistant message', e),
        );
      }

      return { text: response.content };
    }

    throw new Error('AI loop iteration limit reached');
  }

  async runStreamLoop(
    subscriber: Subscriber<any>,
    userId: string,
    resolvedPayload: any,
    conversationId?: string,
    iteration = 0,
  ): Promise<void> {
    if (iteration > 5) throw new Error('AI loop iteration limit reached');

    const providerInstance = this.getProvider(resolvedPayload.provider, resolvedPayload.apiKey);
    const response$ = await providerInstance.prompt(resolvedPayload.model, resolvedPayload.messages, {
      stream: true,
      temperature: resolvedPayload.temperature,
      maxTokens: resolvedPayload.maxTokens,
      tools: AI_TOOLS as any,
    }) as Observable<any>;

    const toolCalls: any[] = [];
    let isTextStreaming = false;
    let accumulatedAssistantText = '';

    return new Promise((resolve, reject) => {
      response$.subscribe({
        next: async (event) => {
          if (event.type === 'text') {
            isTextStreaming = true;
            accumulatedAssistantText += event.content;
            subscriber.next({ type: 'text', content: event.content });
          } else if (event.type === 'tool_calls') {
            toolCalls.push(...event.tool_calls);
          }
        },
        error: reject,
        complete: async () => {
          if (toolCalls.length > 0) {
            const assistantMsg = {
              role: 'assistant' as const,
              content: accumulatedAssistantText,
              tool_calls: toolCalls,
            };
            resolvedPayload.messages.push(assistantMsg);

            if (conversationId) {
              await this.usersService.addMessage(
                userId,
                conversationId,
                assistantMsg.role,
                assistantMsg.content,
                assistantMsg.tool_calls,
              ).catch((e) => console.error('Failed to persist tool call', e));
            }

            for (const tc of toolCalls) {
              subscriber.next({ type: 'tool_call', name: tc.name });
              const result = await this.toolRegistry.run(tc.name, userId, tc.arguments);
              const toolResultMsg = {
                role: 'tool' as const,
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              };
              resolvedPayload.messages.push(toolResultMsg);

              if (conversationId) {
                await this.usersService.addMessage(
                  userId,
                  conversationId,
                  toolResultMsg.role,
                  toolResultMsg.content,
                  undefined,
                  toolResultMsg.tool_call_id,
                ).catch((e) =>
                  console.error('Failed to persist tool result', e),
                );
              }
            }

            await this.runStreamLoop(
              subscriber,
              userId,
              resolvedPayload,
              conversationId,
              iteration + 1,
            );
            resolve();
          } else if (isTextStreaming) {
            if (conversationId && accumulatedAssistantText) {
              await this.usersService.addMessage(
                userId,
                conversationId,
                'assistant',
                accumulatedAssistantText,
              ).catch((e) =>
                console.error('Failed to persist final assistant message', e),
              );
            }
            subscriber.complete();
            resolve();
          } else {
            const fallback = 'מצטער, לא הצלחתי למצוא מידע רלוונטי לבקשה שלך.';
            subscriber.next({ type: 'text', content: fallback });
            if (conversationId) {
              await this.usersService.addMessage(
                userId,
                conversationId,
                'assistant',
                fallback,
              ).catch((e) =>
                console.error(
                  'Failed to persist fallback assistant message',
                  e,
                ),
              );
            }
            subscriber.complete();
            resolve();
          }
        },
      });
    });
  }

  async resolveAiPayload(
    payload: {
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      model: string;
      messages: any[];
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      forceMarkdown?: boolean;
    },
    request?: Request,
  ): Promise<any> {
    if (
      payload.apiKey &&
      typeof payload.stream !== 'undefined' &&
      typeof payload.forceMarkdown !== 'undefined'
    ) {
      return payload;
    }
    if (!request) {
      return payload;
    }

    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      return payload;
    }
    const session = verifyJwtToken(sessionToken);

    const cfg = await this.usersService.getAiConfig(session.userId);

    const userConfig =
      (cfg.aiProviderConfigs && cfg.aiProviderConfigs[payload.provider]) || {};

    const resolvedPayload = { ...payload };

    const resolvedApiKey = (cfg.decryptedApiKeys?.[payload.provider] ||
      (cfg.activeAiProvider === payload.provider ? cfg.decryptedApiKey : null));

    if (resolvedApiKey && resolvedApiKey !== '***') {
      resolvedPayload.apiKey = resolvedApiKey;
    }

    if (
      typeof payload.temperature === 'undefined' &&
      typeof userConfig.temperature !== 'undefined'
    ) {
      resolvedPayload.temperature = userConfig.temperature;
    }
    if (
      typeof payload.maxTokens === 'undefined' &&
      typeof userConfig.maxTokens !== 'undefined'
    ) {
      resolvedPayload.maxTokens = userConfig.maxTokens;
    }
    if (
      typeof payload.stream === 'undefined' &&
      typeof userConfig.stream !== 'undefined'
    ) {
      resolvedPayload.stream = userConfig.stream;
    }

    const hebrewSystemPrompt = `IMPORTANT: Always respond in Hebrew (עברית). Even if the user message is in another language, your response MUST be in Hebrew.
    Today's date is ${new Date().toISOString().slice(0, 10)}. Use this date to compute relative date ranges for tools:
    - "החודש" (this month): from the 1st of the current month until today. E.g. if today is 2026-06-04, start=2026-06-01, end=2026-06-04.
    - "חודש שעבר" (last month): from the 1st of the previous month until the last day of the previous month.
    - If no period is specified, default to the last 30 days.

    You are a helpful financial assistant with access to the user's local database.

    Semantic Discovery Protocol:
    1. ALWAYS use tools to answer questions about money, spending, trends, or specific purchases. Do not guess numbers.
    2. If the user asks which accounts you have access to, what bank accounts or cards are connected, or anything about their connected accounts — ALWAYS call "list_connected_accounts" immediately and present the results. Never say you don't know or that you can't check. You have this tool, use it.
    3. If the user mentions a specific bank, credit card, or card ending in specific digits (e.g. "MAX", "Leumi", "כרטיס האשראי שלי", "הכרטיס שמסתיים ב-9511"):
       - STEP 1: Call "list_connected_accounts" to get all accounts with their bankId, accountNumber, and last4 fields.
       - STEP 2: Match the user's reference to the correct account — by bankId name OR by last4 digits.
       - STEP 3: Call "query_transactions" with the resolved bankId and/or last4 to get filtered results.
    4. If the user asks about a general concept, activity, or English term (e.g., "snooker", "pool", "fast food", "delivery", "groceries", "המברגרים"):
       - STEP 1: Call "find_merchants_by_topic" with that concept. This tool returns exact Hebrew/local business names found in the user's database.
       - STEP 2: Use the merchant names from Step 1 to call "query_transactions" with the correct startDate and endDate.
    5. You can combine both: if the user asks "show me all Wolt transactions on my MAX card", call list_connected_accounts → find_merchants_by_topic("wolt") → query_transactions with both bankId and merchantNames.
    6. Never assume you know business names or bankIds. Always look them up first.
    7. Transparency: Briefly tell the user you are looking up their accounts or merchants while tools are running.
    8. Smart Fallback for Last Transaction and Empty Results:
       - When the user asks for the "last transaction" (התנועה האחרונה) or "latest transactions" (התנועות האחרונות), or when a search for transactions on a specific account returns 0 results for the default 30-day period:
         a) Check the account's 'lastScrapedAt' timestamp returned by 'list_connected_accounts'.
         b) If 'lastScrapedAt' is available and is older than 30 days, or if the initial search returned 0 transactions, DO NOT conclude that there are no transactions. Instead, automatically make a new query (re-run 'query_transactions') extending the date range backward (e.g., 90 days, 180 days, or a custom range ending at 'lastScrapedAt') to find the actual last transactions.
         c) If transactions are found in the expanded period, present them to the user and specify the date range that was searched.
    9. Explicit Tagged Accounts Direction:
       - If the user's message contains any tagged account formatted as \`bankid:bankId:identifier\` (e.g. \`bankid:max:9511\`), this is an explicit direction to check that specific account. You MUST skip the "list_connected_accounts" tool call, and call "query_transactions" directly with the matching bankId and/or last4/accountNumber. Always refer to the account in your response using the same \`bankid:bankId:identifier\` format.

    Financial Data Model — CRITICAL RULES:
    - You can only check for expenses inside credit card/credit companies (like \`bankid:max\`, \`bankid:isracard\`, \`bankid:cal\`). Bank accounts (like \`bankid:hapoalim\`, \`bankid:leumi\`, \`bankid:yahav\`, \`bankid:pepper\`) DO NOT count and should NEVER be queried or reported for expenses.
    - Bank accounts are for income only (deposits, salary, transfers).
    - When a user asks about spending or expenses, ignore bank accounts completely. Only use credit card accounts.
    - When a user asks about income, only use bank accounts.

     Bank ID Display Rule:
    - Whenever you mention a bank or credit-card account, you MUST format it as a backtick inline-code token prefixed with "bankid:".
    - If you know the specific account number or last 4 digits of the card/account, format it as \`bankid:bankId:accountIdentifier\` (e.g., \`bankid:max:9511\`, \`bankid:leumi:1234567\`).
    - If you don't know the account number, format it as \`bankid:bankId\` (e.g., \`bankid:max\`).
    - This renders as a visual chip with the bank logo and the account identifier (if provided) in the UI. When the user copies the chip, it will copy the account details (identifier) instead of just the bankId. Never write raw bankId strings without this format.

    Available Expense Categories: מזון, קניות, בילויים ופנאי, דלק/תחבורה, מנויים, לא מסווג.`;

    const forceMarkdown = true;

    const markdownSystemPrompt = forceMarkdown
      ? 'Always respond in high-quality Markdown format. Keep responses short, concise, and on point. Avoid long markdown responses with many lines. Summarize information, transactions, and metrics in markdown tables as much as possible rather than using long lists or text explanations. Ensure proper spacing and multiple newlines between sections, headers, and tables so they are parsed correctly.'
      : '';

    const combinedSystemPrompt = [hebrewSystemPrompt, markdownSystemPrompt]
      .filter(Boolean)
      .join('\n\n');

    const existingSystemMessage = resolvedPayload.messages.find(
      (m) => m.role === 'system',
    );

    if (existingSystemMessage) {
      // Always rebuild from the fresh combinedSystemPrompt so tool rules are never stale.
      // Preserve any caller-specific content that isn't already in our prompt.
      const callerExtra = existingSystemMessage.content.includes(combinedSystemPrompt)
        ? ''
        : existingSystemMessage.content.replace(combinedSystemPrompt, '').trim();
      existingSystemMessage.content = callerExtra
        ? `${combinedSystemPrompt}\n\n${callerExtra}`
        : combinedSystemPrompt;
    } else {
      resolvedPayload.messages = [
        { role: 'system', content: combinedSystemPrompt },
        ...resolvedPayload.messages,
      ];
    }

    return resolvedPayload;
  }

  async resolveAiModelsPayload(
    payload: {
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      apiKey?: string;
    },
    request?: Request,
  ): Promise<{
    provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
    apiKey?: string;
  }> {
    if (payload.apiKey) {
      return payload;
    }
    if (!request) {
      return payload;
    }

    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      return payload;
    }

    const session = verifyJwtToken(sessionToken);
    const cfg = await this.usersService.getAiConfig(session.userId);

    const resolvedApiKey = (cfg.decryptedApiKeys?.[payload.provider] ||
      (cfg.activeAiProvider === payload.provider ? cfg.decryptedApiKey : null));

    if (resolvedApiKey && resolvedApiKey !== '***') {
      return {
        ...payload,
        apiKey: resolvedApiKey,
      };
    }

    return payload;
  }
}
