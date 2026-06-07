import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';

import { User } from './modules/users/entities/user.entity';
import { ConversationEntity } from './modules/users/entities/conversation.entity';
import { MessageEntity } from './modules/users/entities/message.entity';
import { VaultEntity } from './modules/scraper/entities/vault.entity';
import { ScrapedCacheEntity } from './modules/scraper/entities/cache.entity';
import { MerchantAnnotationEntity } from './modules/scraper/entities/merchant-annotation.entity';
import { TransactionEntity } from './modules/scraper/entities/transaction.entity';
import { ScrapedCoverageEntity } from './modules/scraper/entities/coverage.entity';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AiModule } from './modules/ai/ai.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { SyncModule } from './modules/sync/sync.module';
import { SpendingModule } from './modules/spending/spending.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/users.db',
      entities: [
        User,
        ConversationEntity,
        MessageEntity,
        VaultEntity,
        ScrapedCacheEntity,
        MerchantAnnotationEntity,
        TransactionEntity,
        ScrapedCoverageEntity,
      ],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    AiModule,
    ScraperModule,
    SyncModule,
    SpendingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
