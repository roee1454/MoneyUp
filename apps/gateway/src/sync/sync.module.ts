import { Module, Global } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncJobService } from './sync-job.service';

@Global()
@Module({
  controllers: [SyncController],
  providers: [SyncJobService],
  exports: [SyncJobService],
})
export class SyncModule {}
