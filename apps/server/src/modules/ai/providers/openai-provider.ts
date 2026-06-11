import { Observable } from 'rxjs';
import type { ReadableStream } from 'node:stream/web';
import { AIProvider, PromptOptions } from './ai-provider';
import { OpenAiModels } from '@money-up/common';
import { AiMessage, StructuredResponse } from '@money-up/types';

/**
 * Class representing OpenAIProvider.
 */
export class OpenAIProvider extends AIProvider {
  private readonly baseUrl = 'https://api.openai.com/v1';

  async verifyConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    return OpenAiModels;
  }

  async prompt(
    modelName: string,
    messages: AiMessage[],
    options?: PromptOptions,
  ): Promise<StructuredResponse | Observable<StructuredResponse>> {
    const stream = !!options?.stream;

    // Automatic detection for reasoning/newer models that require max_completion_tokens
    const isNewModel =
      modelName.startsWith('gpt-5') ||
      modelName.startsWith('o1') ||
      modelName.startsWith('o3') ||
      modelName.startsWith('o4');

    const openAiMessages = messages.map((m) => {
      const msg: any = {
        role: m.role,
        content: m.content || null,
      };
      if (m.role === 'tool') {
        msg.tool_call_id = m.tool_call_id;
      }
      if (m.tool_calls && m.tool_calls.length > 0) {
        msg.tool_calls = m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));
      }
      return msg;
    });

    const openAiTools = options?.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const payload: any = {
      model: modelName,
      messages: openAiMessages,
      stream,
    };

    if (openAiTools && openAiTools.length > 0) {
      payload.tools = openAiTools;
    }

    if (isNewModel) {
      payload.max_completion_tokens = options?.maxTokens ?? 1024;
    } else {
      payload.max_tokens = options?.maxTokens ?? 1024;
      payload.temperature = options?.temperature ?? 0.7;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `OpenAI request failed (${res.status}): ${text || 'unknown error'}`,
      );
    }

    if (!stream) {
      const json = (await res.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
            tool_calls?: Array<{
              id: string;
              type: 'function';
              function: { name: string; arguments: string };
            }>;
          };
        }>;
      };

      const choice = json.choices?.[0];
      const message = choice?.message;

      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCalls = message.tool_calls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        }));
        return {
          type: 'tool_calls',
          tool_calls: toolCalls,
          content: message.content || undefined,
        };
      }

      return {
        type: 'text',
        content: message?.content || '',
      };
    }

    if (!res.body) {
      throw new Error('OpenAI stream response body is empty');
    }

    return this.createSseObservable(
      res.body as ReadableStream<Uint8Array<ArrayBuffer>>,
    );
  }

  private createSseObservable(
    body: ReadableStream<Uint8Array>,
  ): Observable<StructuredResponse> {
    return new Observable<StructuredResponse>((subscriber) => {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const toolCallMap = new Map<
        number,
        { id?: string; name?: string; arguments: string }
      >();
      let accumulatedContent = '';

      const pump = async (): Promise<void> => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const choice = parsed.choices?.[0];
                const delta = choice?.delta;

                if (delta?.content) {
                  accumulatedContent += delta.content;
                  subscriber.next({ type: 'text', content: delta.content });
                }

                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index ?? 0;
                    let existing = toolCallMap.get(idx);
                    if (!existing) {
                      existing = { arguments: '' };
                      toolCallMap.set(idx, existing);
                    }
                    if (tc.id) existing.id = tc.id;
                    if (tc.function?.name) existing.name = tc.function.name;
                    if (tc.function?.arguments) {
                      existing.arguments += tc.function.arguments;
                    }
                  }
                }
              } catch {
                // Ignore malformed partial frame
              }
            }
          }

          if (toolCallMap.size > 0) {
            const toolCalls: any[] = [];
            for (const [_, tc] of toolCallMap.entries()) {
              if (tc.id && tc.name) {
                try {
                  toolCalls.push({
                    id: tc.id,
                    name: tc.name,
                    arguments: JSON.parse(tc.arguments),
                  });
                } catch (e) {
                  console.error(
                    'Failed to parse OpenAI tool call arguments',
                    tc.arguments,
                    e,
                  );
                }
              }
            }
            if (toolCalls.length > 0) {
              subscriber.next({
                type: 'tool_calls',
                tool_calls: toolCalls,
                content: accumulatedContent || undefined,
              });
            }
          }

          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        } finally {
          reader.releaseLock();
        }
      };

      void pump();
      return () => {
        void reader.cancel().catch(() => undefined);
      };
    });
  }
}
