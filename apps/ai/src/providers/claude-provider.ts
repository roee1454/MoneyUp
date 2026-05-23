import { Observable } from 'rxjs';
import type { ReadableStream } from 'node:stream/web';
import { AIProvider, PromptOptions } from './ai-provider';

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
    prompt: string,
    options?: PromptOptions,
  ): Promise<string | Observable<string>> {
    const stream = !!options?.stream;
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        stream,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Claude request failed (${res.status}): ${text || 'unknown error'}`,
      );
    }

    if (!stream) {
      const json = (await res.json()) as {
        content?: Array<{ text?: string }>;
      };
      return json.content?.map((c) => c.text || '').join('') ?? '';
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
  ): Observable<string> {
    return new Observable<string>((subscriber) => {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
                const parsed = JSON.parse(data) as {
                  type?: string;
                  delta?: { text?: string };
                };
                if (
                  parsed.type === 'content_block_delta' &&
                  parsed.delta?.text
                ) {
                  subscriber.next(parsed.delta.text);
                }
              } catch {
                // Ignore malformed partial frame
              }
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
