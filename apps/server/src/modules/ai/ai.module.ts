import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ToolRegistry } from './tools/tool-registry';
import { GetSpendingSummaryRunner } from './tools/spending-summary';
import { FindMerchantsRunner } from './tools/find-merchants';
import { QueryTransactionsRunner } from './tools/query-transactions';
import { ListAccountsRunner } from './tools/list-accounts';
import { BankIdMapperRunner } from './tools/bank-id-mapper';
import { UsersModule } from '../users/users.module';
import { ScraperModule } from '../scraper/scraper.module';

@Module({
  imports: [UsersModule, ScraperModule],
  controllers: [AiController],
  providers: [
    AiService,
    ToolRegistry,
    GetSpendingSummaryRunner,
    FindMerchantsRunner,
    QueryTransactionsRunner,
    ListAccountsRunner,
    BankIdMapperRunner,
  ],
  exports: [AiService],
})
export class AiModule {}
