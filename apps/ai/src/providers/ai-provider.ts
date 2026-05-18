import { Observable } from 'rxjs';

export interface PromptOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export abstract class AIProvider {
  constructor(protected readonly apiKey: string) {}

  abstract verifyConnection(): Promise<boolean>;
  abstract listModels(): Promise<string[]>;
  abstract prompt(
    modelName: string,
    prompt: string,
    options?: PromptOptions,
  ): Promise<string | Observable<string>>;
}
