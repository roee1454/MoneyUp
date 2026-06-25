import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import { OllamaProvider } from './providers/ollama-provider';

/**
 * Service managing local Ollama model lifecycle and actions.
 */
@Injectable()
export class OllamaService {
  constructor(private readonly aiService: AiService) {}

  /**
   * Retrieves the list of currently running/loaded models in Ollama memory.
   *
   * @param customApiKey Optional API key or endpoint override.
   * @returns Promise<string[]> A list of loaded model names.
   */
  async getOllamaRunningModels(customApiKey?: string): Promise<string[]> {
    const provider = this.aiService.getProvider('ollama', customApiKey) as OllamaProvider;
    return provider.getLoadedModels();
  }

  /**
   * Instructs Ollama to load a model into memory (keep_alive: -1).
   *
   * @param model Name of the model to start.
   * @param customApiKey Optional API key or endpoint override.
   * @returns Promise<boolean> True if the load command succeeded.
   */
  async startOllamaModel(
    model: string,
    customApiKey?: string,
  ): Promise<boolean> {
    const provider = this.aiService.getProvider('ollama', customApiKey) as OllamaProvider;
    return provider.startModel(model);
  }

  /**
   * Instructs Ollama to unload a model from memory immediately (keep_alive: 0).
   *
   * @param model Name of the model to stop.
   * @param customApiKey Optional API key or endpoint override.
   * @returns Promise<boolean> True if the unload command succeeded.
   */
  async stopOllamaModel(
    model: string,
    customApiKey?: string,
  ): Promise<boolean> {
    const provider = this.aiService.getProvider('ollama', customApiKey) as OllamaProvider;
    return provider.stopModel(model);
  }
}
