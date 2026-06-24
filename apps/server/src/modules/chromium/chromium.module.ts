import { Module } from '@nestjs/common';
import { ChromiumService } from './chromium.service';

@Module({
  providers: [ChromiumService],
  exports: [ChromiumService],
})
export class ChromiumModule {}
