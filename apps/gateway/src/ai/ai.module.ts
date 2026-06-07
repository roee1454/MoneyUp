import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { GatewayAiService } from './ai.service';
import { ToolRegistry } from './tools/tool-registry';
import { GetSpendingSummaryRunner } from './tools/spending-summary';
import { FindMerchantsRunner } from './tools/find-merchants';
import { QueryTransactionsRunner } from './tools/query-transactions';
import { ListAccountsRunner } from './tools/list-accounts';
import { BankIdMapperRunner } from './tools/bank-id-mapper';

@Module({
  controllers: [AiController],
  providers: [
    GatewayAiService,
    ToolRegistry,
    GetSpendingSummaryRunner,
    FindMerchantsRunner,
    QueryTransactionsRunner,
    ListAccountsRunner,
    BankIdMapperRunner,
  ],
})
export class AiModule {}

