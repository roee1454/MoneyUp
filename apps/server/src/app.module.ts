import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
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

function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  // 1. Try to see if we can write to the default local path 'data/app.db'
  let isLocalWritable = false;
  const localDbPath = path.resolve('data/app.db');
  const localDbDir = path.dirname(localDbPath);

  try {
    if (!fs.existsSync(localDbDir)) {
      fs.mkdirSync(localDbDir, { recursive: true });
    }
    // Test write permission by writing a temp file
    const testFile = path.join(localDbDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    isLocalWritable = true;
  } catch (e) {
    isLocalWritable = false;
  }

  // 2. If we are in development mode AND the local directory is writable, use it.
  if (process.env.NODE_ENV !== 'production' && isLocalWritable) {
    return localDbPath;
  }

  // 3. Fallback to OS user-data directory (production, or if local path is read-only)
  const homeDir = os.homedir();
  let appDataDir: string;

  if (process.platform === 'win32') {
    appDataDir = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'moneyup')
      : path.join(homeDir, 'AppData', 'Local', 'moneyup');
  } else if (process.platform === 'darwin') {
    appDataDir = path.join(homeDir, 'Library', 'Application Support', 'moneyup');
  } else {
    appDataDir = process.env.XDG_DATA_HOME
      ? path.join(process.env.XDG_DATA_HOME, 'moneyup')
      : path.join(homeDir, '.local', 'share', 'moneyup');
  }

  const dbDir = path.join(appDataDir, 'data');
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (e) {
    // If even this fails, fallback to temp directory
    return path.join(os.tmpdir(), 'moneyup-app.db');
  }

  return path.join(dbDir, 'app.db');
}

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: getDatabasePath(),
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
