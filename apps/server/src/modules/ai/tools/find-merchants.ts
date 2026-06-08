import { Injectable } from '@nestjs/common';
import { ScraperService } from '../../scraper/scraper.service';;
import { UsersService } from '../../users/users.service';;
import { AiService } from '../ai.service';

import { ToolRunner, ToolRegistry } from './tool-registry';
import { UserAiConfig } from '../../../types/gateway.types';

@Injectable()
export class FindMerchantsRunner implements ToolRunner {
  readonly name = 'find_merchants_by_topic';

  constructor(
    private readonly scraperService: ScraperService,
    private readonly usersService: UsersService,
    private readonly aiService: AiService,
    private readonly registry: ToolRegistry,
  ) {
    this.registry.register(this);
  }

  async execute(userId: string, args: any): Promise<any> {
    try {
      // 1. Fetch all merchant annotations from scraper
      const annotations = await this.scraperService
        .getAllAnnotations()
        .catch(() => [] as any[]);

      if (!annotations || annotations.length === 0) {
        return { topic: args.topic, merchants: [], count: 0 };
      }

      // 2. Build candidate list sorted by relevance score to fit context window comfortably
      const cleanTopic = (args.topic || '').toLowerCase().replace(/[^a-z0-9א-ת]/g, '');
      const candidates = annotations
        .map(a => {
          const name = a.displayMerchant || '';
          const category = a.category || '';
          const keywords = a.keywords || '';
          const cleanName = name.toLowerCase().replace(/[^a-z0-9א-ת]/g, '');
          const cleanKeywords = keywords.toLowerCase().replace(/[^a-z0-9א-ת]/g, '');

          let score = 0;
          if (cleanTopic) {
            if (cleanName === cleanTopic) score += 100;
            else if (cleanName.includes(cleanTopic) || cleanTopic.includes(cleanName)) score += 50;
            else if (cleanKeywords.includes(cleanTopic)) score += 20;
          }
          if (args.topic && category.toLowerCase().includes(args.topic.toLowerCase())) score += 10;

          return { name, category, keywords, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(({ name, category, keywords }) => ({ name, category, keywords }))
        .slice(0, 300);

      // 3. Resolve user's AI config to call the LLM
      const cfg = await this.usersService
        .getAiConfig(userId)
        .catch(() => null);

      if (cfg) {
        const activeProvider = cfg.activeAiProvider || cfg.configuredProviders?.[0];
        const apiKey = activeProvider && activeProvider !== '***'
          ? (cfg.decryptedApiKeys?.[activeProvider] || (cfg.activeAiProvider === activeProvider ? cfg.decryptedApiKey : null))
          : null;
        let model = activeProvider
          ? (cfg.aiProviderConfigs?.[activeProvider]?.model || cfg.preferredModel)
          : null;
        if (!model && activeProvider) {
          if (activeProvider === 'openai') model = 'gpt-4o';
          else if (activeProvider === 'claude') model = 'Sonnet 4.5';
          else if (activeProvider === 'gemini') model = 'gemini-2.5-flash';
        }

        if (activeProvider && apiKey && model) {
          const ragPrompt = `You are a financial analysis assistant.
We have a user search topic/concept: "${args.topic}" (this might be in Hebrew or English).
And here is the list of merchants from the user's database:
${JSON.stringify(candidates)}

Your task is to identify and return a JSON array of strings containing only the exact merchant names (from the list above) that are semantically related to the topic.
Include merchants that match semantically (e.g., "McDonalds" or "Wolt" for "fast food" or "המבורגר", "Netflix" for "TV" or "מנויים").
Return ONLY a valid JSON array of strings. Do not include markdown code block styling or any explanations outside the JSON.`;

          const aiResponse = (await this.aiService.getProvider(activeProvider, apiKey).prompt(model, [{ role: 'user', content: ragPrompt }], { stream: false, temperature: 0, maxTokens: 1024 }).catch(() => null)) as any;

          const responseText = aiResponse?.type === 'text' ? aiResponse.content : (aiResponse?.content ?? '');
          const matchIndex = responseText.indexOf('[');
          const endIndex = responseText.lastIndexOf(']');
          if (matchIndex !== -1 && endIndex !== -1 && endIndex > matchIndex) {
            const cleanJson = responseText.slice(matchIndex, endIndex + 1);
            try {
              const matches = JSON.parse(cleanJson);
              if (Array.isArray(matches)) {
                return {
                  topic: args.topic,
                  merchants: matches,
                  count: matches.length,
                };
              }
            } catch (err) {
              console.error('Failed to parse AI RAG merchant response JSON', err);
            }
          }
        }
      }

      // Fallback: use legacy local scoring + local fuzzy check
      const fallbackMerchants = await this.scraperService
        .findMerchantsByTopic({
          topic: args.topic,
        })
        .catch(() => [] as string[]);

      const localMatches = cleanTopic
        ? annotations
            .map((a) => a.displayMerchant)
            .filter((merchantName) => {
              const cleanMerchant = (merchantName || '').toLowerCase().replace(/[^a-z0-9א-ת]/g, '');
              return cleanMerchant.includes(cleanTopic) || cleanTopic.includes(cleanMerchant);
            })
        : [];

      const merged = Array.from(new Set([...localMatches, ...fallbackMerchants]));

      return {
        topic: args.topic,
        merchants: merged || [],
        count: merged?.length || 0,
      };
    } catch (e) {
      console.error(`Tool ${this.name} execution failed`, e);
      return { error: 'Internal error searching for merchants.' };
    }
  }
}
