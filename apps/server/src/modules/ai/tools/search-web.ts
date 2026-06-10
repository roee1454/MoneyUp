import { Injectable } from '@nestjs/common';
import { ToolRunner, ToolRegistry } from './tool-registry';

@Injectable()
export class SearchWebRunner implements ToolRunner {
  readonly name = 'search_web';

  constructor(private readonly registry: ToolRegistry) {
    this.registry.register(this);
  }

  async execute(userId: string, args: { query: string }): Promise<any> {
    try {
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = await response.text();
      const results: Array<{ title: string; snippet: string }> = [];
      
      // Simple regex parsing for DuckDuckGo HTML
      const resultBlockRegex = /<a class="result__url" href="[^"]*">([^<]*)<\/a>.*?<a class="result__snippet[^"]*"[^>]*>(.*?)<\/a>/gs;
      
      let match;
      let count = 0;
      while ((match = resultBlockRegex.exec(html)) !== null && count < 5) {
        // match[1] might have bold tags etc, we strip them
        const url = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
        const snippet = match[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
        if (snippet) {
           results.push({ title: url, snippet });
           count++;
        }
      }

      // If regex failed to capture properly, let's try another pattern for title
      if (results.length === 0) {
        const altRegex = /<h2 class="result__title">.*?<a[^>]*>(.*?)<\/a>.*?<a class="result__snippet[^"]*"[^>]*>(.*?)<\/a>/gs;
        while ((match = altRegex.exec(html)) !== null && count < 5) {
          const title = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
          const snippet = match[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
          if (snippet) {
             results.push({ title, snippet });
             count++;
          }
        }
      }
      
      return {
        query: args.query,
        results: results.length > 0 ? results : [{ snippet: 'No results found or parsing failed.' }]
      };
    } catch (error: any) {
      return { error: 'Failed to perform web search', details: error.message };
    }
  }
}
