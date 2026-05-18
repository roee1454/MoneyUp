import { Observable } from 'rxjs';
import type { ReadableStream } from 'node:stream/web';
import { AIProvider, PromptOptions } from './ai-provider';

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
      throw new Error(`Gemini list models failed (${res.status}): ${text || 'unknown error'}`);
    }

    const json = (await res.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };

    return (json.models ?? [])
      .filter((m) =>
        (m.supportedGenerationMethods ?? []).some((method) =>
          method === 'generateContent' || method === 'streamGenerateContent',
        ),
      )
      .map((m) => (m.name || '').replace(/^models\//, ''))
      .filter((name): name is string => !!name)
      .sort();
  }

  async prompt(
    modelName: string,
    prompt: string,
    options?: PromptOptions,
  ): Promise<string | Observable<string>> {
    const stream = !!options?.stream;
    const endpoint = stream
      ? `${this.baseUrl}/models/${modelName}:streamGenerateContent?key=${this.apiKey}`
      : `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1024,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini request failed (${res.status}): ${text || 'unknown error'}`);
    }

    if (!stream) {
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }

    if (!res.body) {
      throw new Error('Gemini stream response body is empty');
    }

    return this.createSseObservable(res.body as ReadableStream<Uint8Array<ArrayBuffer>>);
  }

  private createSseObservable(body: ReadableStream<Uint8Array>): Observable<string> {
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
                const parsed = JSON.parse(data) as
                  | Array<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }>
                  | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

                const first = Array.isArray(parsed) ? parsed[0] : parsed;
                const chunk = first?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                if (chunk) subscriber.next(chunk);
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
