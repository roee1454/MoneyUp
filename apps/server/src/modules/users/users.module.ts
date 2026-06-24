import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ConversationEntity } from '../conversations/entities/conversation.entity';
import { MessageEntity } from '../conversations/entities/message.entity';
import { VaultEntity } from '../accounts/entities/vault.entity';
import { ScrapedCacheEntity } from '../accounts/entities/cache.entity';
import { ScrapedCoverageEntity } from '../accounts/entities/coverage.entity';
import { TransactionEntity } from '../accounts/entities/transaction.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SettingsModule } from '../settings/settings.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ConversationEntity,
      MessageEntity,
      VaultEntity,
      ScrapedCacheEntity,
      ScrapedCoverageEntity,
      TransactionEntity,
    ]),
    forwardRef(() => SettingsModule),
    forwardRef(() => ConversationsModule),
    forwardRef(() => AccountsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
