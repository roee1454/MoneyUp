import { Injectable } from '@nestjs/common';
import { ToolRunner, ToolRegistry } from './tool-registry';

/**
 * AI Tool Runner executing tasks for RenderInvestmentSimulator.
 */
@Injectable()
export class RenderInvestmentSimulatorRunner implements ToolRunner {
  readonly name = 'render_investment_simulator';

  constructor(private readonly registry: ToolRegistry) {
    this.registry.register(this);
  }

  async execute(userId: string, args: any): Promise<any> {
    // This tool is purely for Generative UI rendering. 
    // We echo the arguments back so the frontend can intercept the tool call and render the simulator.
    return {
      message: "Simulator rendering requested. The UI will handle the rendering based on these parameters.",
      parameters: args
    };
  }
}
