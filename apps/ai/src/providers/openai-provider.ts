import { Observable } from 'rxjs';
import type { ReadableStream } from 'node:stream/web';
import { AIProvider, PromptOptions } from './ai-provider';
import { OPENAI_MODELS } from '@money-up/common';

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
    return OPENAI_MODELS;
  }

  async prompt(
    modelName: string,
    prompt: string,
    options?: PromptOptions,
  ): Promise<string | Observable<string>> {
    const stream = !!options?.stream;

    // Automatic detection for reasoning/newer models that require max_completion_tokens
    const isNewModel =
      modelName.startsWith('gpt-5') ||
      modelName.startsWith('o1') ||
      modelName.startsWith('o3') ||
      modelName.startsWith('o4');

    const payload: any = {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      stream,
    };

    if (isNewModel) {
      payload.max_completion_tokens = options?.maxTokens ?? 1024;
      // Newer reasoning models often reject the temperature parameter
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
        choices?: Array<{ message?: { content?: string } }>;
      };
      return json.choices?.[0]?.message?.content ?? '';
    }

    if (!res.body) {
      throw new Error('OpenAI stream response body is empty');
    }

    return this.createSseObservable(
      res.body as ReadableStream<Uint8Array<ArrayBuffer>>,
      (json) => {
        return json?.choices?.[0]?.delta?.content || '';
      },
    );
  }

  private createSseObservable(
    body: ReadableStream<Uint8Array>,
    extractText: (json: any) => string,
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
                const parsed = JSON.parse(data);
                const chunk = extractText(parsed);
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
