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
import { GetPortfolioRunner } from './tools/get-portfolio';
import { GetTechnicalAnalysisRunner } from './tools/get-technical-analysis';
import { SearchWebRunner } from './tools/search-web';
import { ReadWebpageRunner } from './tools/read-webpage';
import { RenderInvestmentSimulatorRunner } from './tools/render-investment-simulator';
import { SearchPastConversationsRunner, GetPastConversationMessagesRunner } from './tools/conversation-context';
import { UsersModule } from '../users/users.module';
import { ScraperModule } from '../scraper/scraper.module';
import { SpendingModule } from '../spending/spending.module';
import { BrokerModule } from '../broker/broker.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { ConversationsModule } from '../conversations/conversations.module';

/**
 * NestJS Module configuring declarations and providers for Ai.
 */
@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => ScraperModule),
    forwardRef(() => ConversationsModule),
    forwardRef(() => SpendingModule),
    forwardRef(() => BrokerModule),
    forwardRef(() => MarketDataModule),
  ],
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
    GetPortfolioRunner,
    GetTechnicalAnalysisRunner,
    SearchWebRunner,
    ReadWebpageRunner,
    RenderInvestmentSimulatorRunner,
    SearchPastConversationsRunner,
    GetPastConversationMessagesRunner,
  ],
  exports: [AiService],
})
export class AiModule {}
