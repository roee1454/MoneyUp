import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { SpendingAnnotationService } from '../../spending/spending-annotation.service';
import { ToolRunner, ToolRegistry } from './tool-registry';

/**
 * AI Tool Runner executing tasks for ClassifyMerchants.
 */
@Injectable()
export class ClassifyMerchantsRunner implements ToolRunner {
  readonly name = 'classify_merchants_with_ai';

  constructor(
    @Inject(forwardRef(() => SpendingAnnotationService))
    private readonly spendingAnnotationService: SpendingAnnotationService,
    private readonly registry: ToolRegistry,
  ) {
    this.registry.register(this);
  }

  async execute(userId: string, args: any, context?: { provider: string; model: string }): Promise<any> {
    try {
      if (!args.unresolved || !Array.isArray(args.unresolved)) {
        return { error: 'Missing or invalid unresolved merchants array.' };
      }

      const results = await this.spendingAnnotationService.classifyUnknownMerchantsWithAi(
        userId,
        args.unresolved,
        context?.provider as any,
        context?.model,
      );

      return {
        success: true,
        classifications: results,
      };
    } catch (e) {
      console.error(`Tool ${this.name} execution failed`, e);
      return { error: 'Internal error executing tool.' };
    }
  }
}
