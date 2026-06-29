import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Observable, Subscriber } from 'rxjs';
import { UserAiConfig } from '../../types/gateway.types';
import { getSessionToken, verifyJwtToken } from '../../utils/auth.utils';
import { ToolRegistry } from './tools/tool-registry';
import {
  AI_TOOLS,
  MERCHANT_CATEGORIZATION_RULES,
  AgentProvider,
  resolveAutoModel,
  AiTask,
  getHebrewSystemPrompt,
  getMarkdownSystemPrompt,
} from '@money-up/common';
import { UsersService } from '../users/users.service';
import { ConversationsService } from '../conversations/conversations.service';

import { AIProvider } from './providers/ai-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { ClaudeProvider } from './providers/claude-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { OllamaProvider } from './providers/ollama-provider';

type ProviderName = AgentProvider;

/**
 * AI Service managing connections to various LLM API providers.
 * Resolves user credentials, injects context-specific financial instruction rules,
 * invokes agents with tools, and manages real-time streaming chat loops.
 */
@Injectable()
export class AiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly conversationsService: ConversationsService,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  /**
   * Instantiates the specified AI provider with an API key.
   * Prioritizes user-configured overrides, falling back to server environment variables.
   *
   * @param providerName The target provider identifier ('openai', 'claude', 'gemini', or 'ollama').
   * @param customApiKey Optional raw API key to override global config.
   * @returns An instance of the AIProvider wrapper class.
   * @throws InternalServerErrorException if the required API key is missing or the provider is unsupported.
   */
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
      default:
        throw new InternalServerErrorException(
        `Unsupported provider: ${providerName}`,
        );
    }
  }

  /**
   * Executes a non-streaming prompting session with the AI.
   * Runs an agentic loop (up to 5 iterations) to resolve any tool calls made by the model,
   * executes those tools locally using the ToolRegistry, feeds the outputs back to the model,
   * and persists conversation history in the database.
   *
   * @param userId The ID of the user triggering the request.
   * @param resolved The pre-resolved payload containing AI settings and messages.
   * @param conversationId Optional conversation ID to persist messages in history.
   * @returns Promise<{ text: string }> containing the final text response from the model.
   * @throws Error if the agentic loop iteration limit is reached.
   */
  async promptNonStream(
    userId: string,
    resolved: any,
    conversationId?: string,
  ): Promise<{ text: string }> {
    let currentMessages = [...resolved.messages];
    let iteration = 0;

    const providerInstance = this.getProvider(
      resolved.provider,
      resolved.apiKey,
    );

    while (iteration < 5) {
      iteration++;
      const response = (await providerInstance.prompt(
        resolved.model,
        currentMessages,
        {
          stream: false,
          temperature: resolved.temperature,
          maxTokens: resolved.maxTokens,
          tools: AI_TOOLS as any,
        },
      )) as any;

      if (response.type === 'tool_calls') {
        const assistantMsg = {
          role: 'assistant' as const,
          content: response.content || '',
          tool_calls: response.tool_calls,
        };
        currentMessages.push(assistantMsg);

        if (conversationId) {
          await this.conversationsService
            .addMessage(
              userId,
              conversationId,
              assistantMsg.role,
              assistantMsg.content,
              assistantMsg.tool_calls,
            )
            .catch((e) => console.error('Failed to persist tool call', e));
        }

        for (const tc of response.tool_calls) {
          const result = await this.toolRegistry.run(
            tc.name,
            userId,
            tc.arguments,
            { provider: resolved.provider, model: resolved.model },
          );
          const toolResultMsg = {
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          };
          currentMessages.push(toolResultMsg);

          if (conversationId) {
            await this.conversationsService
              .addMessage(
                userId,
                conversationId,
                toolResultMsg.role,
                toolResultMsg.content,
                undefined,
                toolResultMsg.tool_call_id,
              )
              .catch((e) => console.error('Failed to persist tool result', e));
          }
        }
        continue;
      }

      if (conversationId && response.content) {
        await this.conversationsService
          .addMessage(userId, conversationId, 'assistant', response.content)
          .catch((e) =>
            console.error('Failed to persist final assistant message', e),
          );
      }

      return { text: response.content };
    }

    throw new Error('AI loop iteration limit reached');
  }

  /**
   * Runs the real-time streaming agentic prompt loop.
   * Streams token-by-token responses to the user subscriber.
   * If the model requests a tool call, intercepts the stream, executes the tool,
   * adds the tool response to the history, and resumes streaming/reasoning.
   *
   * @param subscriber Subscriber to stream token updates back to.
   * @param userId The ID of the user requesting the prompt.
   * @param resolvedPayload The payload containing provider, model, and message history.
   * @param conversationId Optional conversation ID for database persistence.
   * @param iteration Current depth of the agentic tool-execution recursive loop.
   * @returns Promise<void>
   */
  async runStreamLoop(
    subscriber: Subscriber<any>,
    userId: string,
    resolvedPayload: any,
    conversationId?: string,
    iteration = 0,
  ): Promise<void> {
    if (iteration > 5) {
      subscriber.next({
        type: 'text',
        content:
          '\n\n*הערה: המערכת הפסיקה ניסיונות נוספים למצוא נתונים מדויקים עקב ריבוי כשלונות.*',
      });
      subscriber.complete();
      return;
    }

    const providerInstance = this.getProvider(
      resolvedPayload.provider,
      resolvedPayload.apiKey,
    );
    const response$ = (await providerInstance.prompt(
      resolvedPayload.model,
      resolvedPayload.messages,
      {
        stream: true,
        temperature: resolvedPayload.temperature,
        maxTokens: resolvedPayload.maxTokens,
        tools: AI_TOOLS as any,
      },
    )) as Observable<any>;

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
          try {
            if (toolCalls.length > 0) {
              const assistantMsg = {
                role: 'assistant' as const,
                content: accumulatedAssistantText,
                tool_calls: toolCalls,
              };
              resolvedPayload.messages.push(assistantMsg);

              if (conversationId) {
                await this.conversationsService
                  .addMessage(
                    userId,
                    conversationId,
                    assistantMsg.role,
                    assistantMsg.content,
                    assistantMsg.tool_calls,
                  )
                  .catch((e) =>
                    console.error('Failed to persist tool call', e),
                  );
              }

              for (const tc of toolCalls) {
                subscriber.next({ type: 'tool_call', name: tc.name });
                const result = await this.toolRegistry.run(
                  tc.name,
                  userId,
                  tc.arguments,
                  {
                    provider: resolvedPayload.provider,
                    model: resolvedPayload.model,
                  },
                );
                const toolResultMsg = {
                  role: 'tool' as const,
                  tool_call_id: tc.id,
                  content: JSON.stringify(result),
                };
                resolvedPayload.messages.push(toolResultMsg);

                if (conversationId) {
                  await this.conversationsService
                    .addMessage(
                      userId,
                      conversationId,
                      toolResultMsg.role,
                      toolResultMsg.content,
                      undefined,
                      toolResultMsg.tool_call_id,
                    )
                    .catch((e) =>
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
                await this.conversationsService
                  .addMessage(
                    userId,
                    conversationId,
                    'assistant',
                    accumulatedAssistantText,
                  )
                  .catch((e) =>
                    console.error(
                      'Failed to persist final assistant message',
                      e,
                    ),
                  );
              }
              subscriber.complete();
              resolve();
            } else {
              const fallback = 'מצטער, לא הצלחתי למצוא מידע רלוונטי לבקשה שלך.';
              subscriber.next({ type: 'text', content: fallback });
              if (conversationId) {
                await this.conversationsService
                  .addMessage(userId, conversationId, 'assistant', fallback)
                  .catch((e) =>
                    console.error(
                      'Failed to persist fallback assistant message',
                      e,
                    ),
                  );
              }
              subscriber.complete();
              resolve();
            }
          } catch (err) {
            subscriber.error(err);
            reject(err);
          }
        },
      });
    });
  }

  /**
   * Resolves the complete AI request payload by loading user configuration overrides
   * (e.g., active provider API keys, custom temperature, max tokens, stream options)
   * and injecting the system instructions (Hebrew language rules, tool registry directions,
   * bank/credit card semantic protocols, and investment simulation requirements).
   *
   * @param payload User configuration and current message history.
   * @param request The incoming HTTP Express request (used to verify cookies and session token).
   * @returns Promise<any> The augmented/resolved AI payload ready to be sent to a provider.
   */
  async resolveAiPayload(
    payload: {
      provider: AgentProvider;
      model: string;
      messages: any[];
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      forceMarkdown?: boolean;
      task?: AiTask;
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

    const sessionToken = getSessionToken(request);
    if (!sessionToken) {
      return payload;
    }
    const session = verifyJwtToken(sessionToken);

    const cfg = await this.usersService.getAiConfig(session.userId);
    const user = await this.usersService.findOne(session.userId);
    const defaultCurrency = user?.defaultCurrency || 'ILS';

    const userConfig =
      (cfg.aiProviderConfigs && cfg.aiProviderConfigs[payload.provider]) || {};

    const resolvedPayload = { ...payload };

    if (!resolvedPayload.model || resolvedPayload.model === 'auto') {
      resolvedPayload.model = resolveAutoModel(resolvedPayload.provider, payload.task || 'chat');
    }

    const resolvedApiKey =
      cfg.decryptedApiKeys?.[payload.provider] ||
      (cfg.activeAiProvider === payload.provider ? cfg.decryptedApiKey : null);

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

    const forceMarkdown = true;
    const hebrewSystemPrompt = getHebrewSystemPrompt(defaultCurrency, new Date().toISOString().slice(0, 10));
    const markdownSystemPrompt = getMarkdownSystemPrompt(forceMarkdown);

    const combinedSystemPrompt = [
      hebrewSystemPrompt,
      markdownSystemPrompt,
      MERCHANT_CATEGORIZATION_RULES,
    ]
      .filter(Boolean)
      .join('\n\n');

    const existingSystemMessage = resolvedPayload.messages.find(
      (m) => m.role === 'system',
    );

    if (existingSystemMessage) {
      // Always rebuild from the fresh combinedSystemPrompt so tool rules are never stale.
      // Preserve any caller-specific content that isn't already in our prompt.
      const callerExtra = existingSystemMessage.content.includes(
        combinedSystemPrompt,
      )
        ? ''
        : existingSystemMessage.content
            .replace(combinedSystemPrompt, '')
            .trim();
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

  /**
   * Resolves the API payload used specifically to fetch models from the selected provider.
   * Retrieves any decryped user API keys for authentication.
   *
   * @param payload Contains provider name and optional API key.
   * @param request Incoming HTTP request to resolve user session and fetch config.
   * @returns Promise<{ provider: ProviderName; apiKey?: string }> The resolved configuration object.
   */
  async resolveAiModelsPayload(
    payload: {
      provider: AgentProvider;
      apiKey?: string;
    },
    request?: Request,
  ): Promise<{
    provider: AgentProvider;
    apiKey?: string;
  }> {
    if (payload.apiKey) {
      return payload;
    }
    if (!request) {
      return payload;
    }

    const sessionToken = getSessionToken(request);
    if (!sessionToken) {
      return payload;
    }

    const session = verifyJwtToken(sessionToken);
    const cfg = await this.usersService.getAiConfig(session.userId);

    const resolvedApiKey =
      cfg.decryptedApiKeys?.[payload.provider] ||
      (cfg.activeAiProvider === payload.provider ? cfg.decryptedApiKey : null);

    if (resolvedApiKey && resolvedApiKey !== '***') {
      return {
        ...payload,
        apiKey: resolvedApiKey,
      };
    }

    return payload;
  }
}
