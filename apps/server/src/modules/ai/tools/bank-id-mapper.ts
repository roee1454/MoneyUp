import { Injectable } from '@nestjs/common';
import { ToolRunner, ToolRegistry } from './tool-registry';

/**
 * AI Tool Runner executing tasks for BankIdMapper.
 */
@Injectable()
export class BankIdMapperRunner implements ToolRunner {
  readonly name = 'bank_id_mapper';

  constructor(private readonly registry: ToolRegistry) {
    this.registry.register(this);
  }

  async execute(userId: string, _args: any): Promise<any> {
    return {
      hapoalim: { name: 'בנק הפועלים', type: 'bank' },
      max: { name: 'MAX', type: 'credit' },
      isracard: { name: 'ישראכרט', type: 'credit' },
      cal: { name: 'CAL', type: 'credit' },
      leumi: { name: 'לאומי', type: 'bank' },
      pepper: { name: 'PEPPER', type: 'bank' },
      yahav: { name: 'בנק יהב', type: 'bank' },
    };
  }
}
