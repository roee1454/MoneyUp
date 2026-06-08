import { Module, forwardRef } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ToolRegistry } from './tools/tool-registry';
import { GetSpendingSummaryRunner } from './tools/spending-summary';
import { FindMerchantsRunner } from './tools/find-merchants';
import { QueryTransactionsRunner } from './tools/query-transactions';
import { ListAccountsRunner } from './tools/list-accounts';
import { BankIdMapperRunner } from './tools/bank-id-mapper';
import { ClassifyMerchantsRunner } from './tools/classify-merchants';
import { UsersModule } from '../users/users.module';
import { ScraperModule } from '../scraper/scraper.module';
import { SpendingModule } from '../spending/spending.module';

@Module({
  imports: [UsersModule, ScraperModule, forwardRef(() => SpendingModule)],
  controllers: [AiController],
  providers: [
    AiService,
    ToolRegistry,
    GetSpendingSummaryRunner,
    FindMerchantsRunner,
    QueryTransactionsRunner,
    ListAccountsRunner,
    BankIdMapperRunner,
    ClassifyMerchantsRunner,
  ],
  exports: [AiService],
})
export class AiModule {}
