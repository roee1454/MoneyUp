import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultEntity } from './entities/vault.entity';
import { ScrapedCacheEntity } from './entities/cache.entity';
import { ScrapedCoverageEntity } from './entities/coverage.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { MerchantAnnotationEntity } from './entities/merchant-annotation.entity';
import { User } from '../users/entities/user.entity';
import { CredentialsService } from './services/credentials.service';
import { CacheService } from './services/cache.service';
import { CoverageService } from './services/coverage.service';
import { ScansService } from './services/scans.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VaultEntity,
      ScrapedCacheEntity,
      ScrapedCoverageEntity,
      TransactionEntity,
      MerchantAnnotationEntity,
      User,
    ]),
    forwardRef(() => UsersModule),
  ],
  providers: [
    CredentialsService,
    CacheService,
    CoverageService,
    ScansService,
  ],
  exports: [
    CredentialsService,
    CacheService,
    CoverageService,
    ScansService,
  ],
})
export class AccountsModule {}
