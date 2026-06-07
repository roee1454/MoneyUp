import { Observable } from 'rxjs';
import type { ReadableStream } from 'node:stream/web';
import { AIProvider, PromptOptions } from './ai-provider';
import { AiMessage, StructuredResponse } from '@money-up/types';

export class GeminiProvider extends AIProvider {
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async verifyConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Gemini list models failed (${res.status}): ${text || 'unknown error'}`,
      );
    }

    const json = (await res.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };

    return (json.models ?? [])
      .filter((m) =>
        (m.supportedGenerationMethods ?? []).some(
          (method) =>
            method === 'generateContent' || method === 'streamGenerateContent',
        ),
      )
      .map((m) => (m.name || '').replace(/^models\//, ''))
      .filter((name): name is string => !!name)
      .sort();
  }

  async prompt(
    modelName: string,
    messages: AiMessage[],
    options?: PromptOptions,
  ): Promise<StructuredResponse | Observable<StructuredResponse>> {
    const stream = !!options?.stream;
    const endpoint = stream
      ? `${this.baseUrl}/models/${modelName}:streamGenerateContent?key=${this.apiKey}`
      : `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;

    const systemMessage = messages.find((m) => m.role === 'system');
    const systemInstruction = systemMessage
      ? { parts: [{ text: systemMessage.content }] }
      : undefined;
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const findToolName = (id: string | undefined, list: AiMessage[]): string => {
      if (!id) return 'unknown';
      for (const msg of list) {
        if (msg.tool_calls) {
          const found = msg.tool_calls.find((tc) => tc.id === id);
          if (found) return found.name;
        }
      }
      return id; // fallback
    };

    const geminiContents = nonSystemMessages.map((m) => {
      if (m.role === 'tool') {
        let parsedResponse = {};
        try {
          parsedResponse = JSON.parse(m.content);
        } catch {
          parsedResponse = { result: m.content };
        }
        return {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: findToolName(m.tool_call_id, messages),
                response: { output: parsedResponse },
              },
            },
          ],
        };
      }

      if (m.tool_calls && m.tool_calls.length > 0) {
        const parts: any[] = [];
        if (m.content) {
          parts.push({ text: m.content });
        }
        for (const tc of m.tool_calls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.arguments,
            },
          });
        }
        return {
          role: 'model',
          parts,
        };
      }

      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      };
    });

    const geminiTools =
      options?.tools && options.tools.length > 0
        ? [
            {
              functionDeclarations: options.tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              })),
            },
          ]
        : undefined;

    const payload: any = {
      contents: geminiContents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 1024,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }

    if (geminiTools) {
      payload.tools = geminiTools;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Gemini request failed (${res.status}): ${text || 'unknown error'}`,
      );
    }

    if (!stream) {
      const json = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
              functionCall?: { name: string; args?: any };
            }>;
          };
        }>;
      };

      const candidate = json.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const textParts = parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join('');
      const functionCallParts = parts.filter((p) => p.functionCall);

      if (functionCallParts.length > 0) {
        const toolCalls = functionCallParts.map((f, idx) => ({
          id: `${f.functionCall!.name}_${Date.now()}_${idx}`,
          name: f.functionCall!.name,
          arguments: f.functionCall!.args || {},
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
      throw new Error('Gemini stream response body is empty');
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

      const toolCallMap = new Map<string, { name: string; arguments: string }>();
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
                const first = Array.isArray(parsed) ? parsed[0] : parsed;
                const candidate = first?.candidates?.[0];
                const parts = candidate?.content?.parts ?? [];

                for (const part of parts) {
                  if (part.text) {
                    accumulatedContent += part.text;
                    subscriber.next({ type: 'text', content: part.text });
                  }
                  if (part.functionCall?.name) {
                    const name = part.functionCall.name;
                    let existing = toolCallMap.get(name);
                    if (!existing) {
                      existing = { name, arguments: '' };
                      toolCallMap.set(name, existing);
                    }
                    if (part.functionCall.args) {
                      existing.arguments += JSON.stringify(part.functionCall.args);
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
            let idx = 0;
            for (const [name, tc] of toolCallMap.entries()) {
              try {
                let args = {};
                if (tc.arguments) {
                  try {
                    args = JSON.parse(tc.arguments);
                  } catch {
                    const matches = tc.arguments.match(/\{.*?\}/g);
                    if (matches) {
                      args = JSON.parse(matches[matches.length - 1]);
                    }
                  }
                }
                toolCalls.push({
                  id: `${name}_${Date.now()}_${idx++}`,
                  name,
                  arguments: args,
                });
              } catch (e) {
                console.error(
                  'Failed to parse Gemini tool call arguments',
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
