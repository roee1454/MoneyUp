import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';

// Domain Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AiModule } from './ai/ai.module';
import { ScraperModule } from './scrapers/scraper.module';
import { SyncModule } from './sync/sync.module';
import { SpendingModule } from './spending/spending.module';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AI_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.AI_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.AI_SERVICE_PORT ?? 3001),
        },
      },
      {
        name: 'SCRAPER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.SCRAPER_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.SCRAPER_SERVICE_PORT ?? 3002),
        },
      },
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.AUTH_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.AUTH_SERVICE_PORT ?? 3003),
        },
      },
      {
        name: 'USERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.USERS_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.USERS_SERVICE_PORT ?? 3004),
        },
      },
    ]),
    AuthModule,
    UsersModule,
    AiModule,
    ScraperModule,
    SyncModule,
    SpendingModule,
  ],
  controllers: [AppController],
  exports: [ClientsModule],
})
export class AppModule {}
