import { Injectable } from '@nestjs/common';

export interface ToolRunner {
  name: string;
  execute(userId: string, args: any, context?: { provider: string; model: string }): Promise<any>;
}

/**
 * Class representing ToolRegistry.
 */
@Injectable()
export class ToolRegistry {
  private readonly runners = new Map<string, ToolRunner>();

  register(runner: ToolRunner) {
    this.runners.set(runner.name, runner);
  }

  async run(name: string, userId: string, args: any, context?: { provider: string; model: string }): Promise<any> {
    const runner = this.runners.get(name);
    if (!runner) return { error: `Tool ${name} not found.` };
    return runner.execute(userId, args, context);
  }
}
