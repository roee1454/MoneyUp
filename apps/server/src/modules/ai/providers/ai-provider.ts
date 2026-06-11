import { Observable } from 'rxjs';
import { AiMessage, AiToolDefinition, StructuredResponse } from '@money-up/types';

export { AiMessage, AiToolDefinition as AiTool, StructuredResponse } from '@money-up/types';

export interface PromptOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  tools?: AiToolDefinition[];
}

/**
 * Class representing AIProvider.
 */
export abstract class AIProvider {
  constructor(protected readonly apiKey: string) {}

  abstract verifyConnection(): Promise<boolean>;
  abstract listModels(): Promise<string[]>;
  abstract prompt(
    modelName: string,
    messages: AiMessage[],
    options?: PromptOptions,
  ): Promise<StructuredResponse | Observable<StructuredResponse>>;
}
