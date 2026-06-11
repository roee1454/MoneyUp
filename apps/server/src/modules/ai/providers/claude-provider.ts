import { Observable } from 'rxjs';
import type { ReadableStream } from 'node:stream/web';
import { AIProvider, PromptOptions } from './ai-provider';
import { AiMessage, StructuredResponse } from '@money-up/types';

/**
 * Class representing ClaudeProvider.
 */
export class ClaudeProvider extends AIProvider {
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  async verifyConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Claude list models failed (${res.status}): ${text || 'unknown error'}`,
      );
    }

    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    return (json.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => !!id)
      .sort();
  }

  async prompt(
    modelName: string,
    messages: AiMessage[],
    options?: PromptOptions,
  ): Promise<StructuredResponse | Observable<StructuredResponse>> {
    const stream = !!options?.stream;

    const systemMessage = messages.find((m) => m.role === 'system');
    const systemPrompt = systemMessage ? systemMessage.content : undefined;
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const claudeMessages = nonSystemMessages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: m.tool_call_id || '',
              content: m.content || '',
            },
          ],
        };
      }
      if (m.tool_calls && m.tool_calls.length > 0) {
        const contentParts: any[] = [];
        if (m.content) {
          contentParts.push({ type: 'text', text: m.content });
        }
        for (const tc of m.tool_calls) {
          contentParts.push({
            type: 'tool_use' as const,
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          });
        }
        return {
          role: 'assistant' as const,
          content: contentParts,
        };
      }
      return {
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content || '',
      };
    });

    const claudeTools = options?.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    const payload: any = {
      model: modelName,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
      stream,
      messages: claudeMessages,
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    if (claudeTools && claudeTools.length > 0) {
      payload.tools = claudeTools;
    }

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Claude request failed (${res.status}): ${text || 'unknown error'}`,
      );
    }

    if (!stream) {
      const json = (await res.json()) as {
        content?: Array<
          | { type: 'text'; text: string }
          | { type: 'tool_use'; id: string; name: string; input: any }
        >;
      };

      const content = json.content ?? [];
      const textParts = content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map((c) => c.text)
        .join('');
      const toolUseParts = content.filter(
        (c): c is { type: 'tool_use'; id: string; name: string; input: any } =>
          c.type === 'tool_use',
      );

      if (toolUseParts.length > 0) {
        const toolCalls = toolUseParts.map((t) => ({
          id: t.id,
          name: t.name,
          arguments: t.input,
        }));
        return {
          type: 'tool_calls',
          tool_calls: toolCalls,
          content: textParts || undefined,
        };
      }

      return {
        type: 'text',
        content: textParts,
      };
    }

    if (!res.body) {
      throw new Error('Claude stream response body is empty');
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
        { id: string; name: string; arguments: string }
      >();
      let currentBlockIndex = -1;
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
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'content_block_start') {
                  currentBlockIndex = parsed.index ?? 0;
                  if (parsed.content_block?.type === 'tool_use') {
                    toolCallMap.set(currentBlockIndex, {
                      id: parsed.content_block.id,
                      name: parsed.content_block.name,
                      arguments: '',
                    });
                  }
                } else if (parsed.type === 'content_block_delta') {
                  const delta = parsed.delta;
                  const idx = parsed.index ?? currentBlockIndex;
                  if (delta?.type === 'text_delta' && delta?.text) {
                    accumulatedContent += delta.text;
                    subscriber.next({ type: 'text', content: delta.text });
                  } else if (
                    delta?.type === 'input_json_delta' &&
                    delta?.partial_json
                  ) {
                    const existing = toolCallMap.get(idx);
                    if (existing) {
                      existing.arguments += delta.partial_json;
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
              try {
                toolCalls.push({
                  id: tc.id,
                  name: tc.name,
                  arguments: JSON.parse(tc.arguments),
                });
              } catch (e) {
                console.error(
                  'Failed to parse Claude tool call arguments',
                  tc.arguments,
                  e,
                );
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
