import { Injectable } from '@nestjs/common';
import { ToolRunner, ToolRegistry } from './tool-registry';

/**
 * AI Tool Runner executing tasks for ReadWebpage.
 */
@Injectable()
export class ReadWebpageRunner implements ToolRunner {
  readonly name = 'read_webpage';

  constructor(private readonly registry: ToolRegistry) {
    this.registry.register(this);
  }

  async execute(userId: string, args: { url: string }): Promise<any> {
    try {
      const response = await fetch(args.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      
      if (!response.ok) {
        return { error: `Failed to fetch webpage. Status: ${response.status}` };
      }

      const html = await response.text();
      
      // Simple extraction of paragraph text to avoid massive HTML payloads
      const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gis;
      let match;
      const paragraphs: string[] = [];
      let count = 0;
      
      while ((match = paragraphRegex.exec(html)) !== null && count < 30) {
        // Strip inner HTML tags
        const text = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
        if (text && text.length > 20) {
          paragraphs.push(text);
          count++;
        }
      }

      if (paragraphs.length === 0) {
        return { url: args.url, content: "Could not extract readable text from this page. It might be heavily javascript-rendered or block bots." };
      }

      return {
        url: args.url,
        content: paragraphs.join('\n\n')
      };
    } catch (error: any) {
      return { error: 'Failed to read webpage', details: error.message };
    }
  }
}
