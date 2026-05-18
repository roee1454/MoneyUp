import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AllExceptionsFilter, LoggingInterceptor } from '@money-up/common';
import { ScraperModule } from './scraper.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ScraperModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.HOST ?? '0.0.0.0',
        port: Number(process.env.SCRAPER_SERVICE_PORT ?? 3002),
      },
    },
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  await app.listen();
}
bootstrap();
