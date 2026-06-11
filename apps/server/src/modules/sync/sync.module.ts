import { Module, Global } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncJobService } from './sync-job.service';
import { ScraperModule } from '../scraper/scraper.module';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [ScraperModule, UsersModule],
  controllers: [SyncController],
  providers: [SyncJobService],
  exports: [SyncJobService],
})
/**
 * NestJS Module configuring declarations and providers for Sync.
 */
export class SyncModule {}
