import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';

// Entities
import { User } from './modules/users/entities/user.entity';
import { ConversationEntity } from './modules/conversations/entities/conversation.entity';
import { MessageEntity } from './modules/conversations/entities/message.entity';
import { VaultEntity } from './modules/accounts/entities/vault.entity';
import { ScrapedCacheEntity } from './modules/accounts/entities/cache.entity';
import { MerchantAnnotationEntity } from './modules/accounts/entities/merchant-annotation.entity';
import { TransactionEntity } from './modules/accounts/entities/transaction.entity';
import { ScrapedCoverageEntity } from './modules/accounts/entities/coverage.entity';
import { AiSettingsEntity } from './modules/settings/entities/ai-settings.entity';
import { ScraperSettingsEntity } from './modules/settings/entities/scraper-settings.entity';
import { AccountSettingsEntity } from './modules/settings/entities/account-settings.entity';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AiModule } from './modules/ai/ai.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { SyncModule } from './modules/sync/sync.module';
import { SpendingModule } from './modules/spending/spending.module';
import { BrokerModule } from './modules/broker/broker.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { ExportModule } from './modules/export/export.module';
import { ChromiumModule } from './modules/chromium/chromium.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { AccountsModule } from './modules/accounts/accounts.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/app.db',
      entities: [
        User,
        ConversationEntity,
        MessageEntity,
        VaultEntity,
        ScrapedCacheEntity,
        MerchantAnnotationEntity,
        TransactionEntity,
        ScrapedCoverageEntity,
        AiSettingsEntity,
        ScraperSettingsEntity,
        AccountSettingsEntity,
      ],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    AiModule,
    ScraperModule,
    SyncModule,
    SpendingModule,
    BrokerModule,
    MarketDataModule,
    ExportModule,
    ChromiumModule,
    SettingsModule,
    ConversationsModule,
    AccountsModule,
  ],
  controllers: [AppController],
})
/**
 * NestJS Module configuring declarations and providers for App.
 */
export class AppModule {}
