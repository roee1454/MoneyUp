import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';

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
        name: "AUTH_SERVICE",
        transport: Transport.TCP,
        options: {
          host: process.env.AUTH_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.AUTH_SERVICE_PORT ?? 3003)
        }
      }
    ]),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
