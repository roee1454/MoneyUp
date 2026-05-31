import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AllExceptionsFilter, LoggingInterceptor } from '@money-up/common/backend';
import { AiModule } from './ai.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AiModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.HOST ?? '0.0.0.0',
        port: Number(process.env.AI_SERVICE_PORT ?? 3001),
      },
    },
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Diagnostic memory logging
  setInterval(() => {
    const usage = process.memoryUsage();
    console.log(`[AI Memory] RSS: ${Math.round(usage.rss / 1024 / 1024)}MB, Heap: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
  }, 60000);

  await app.listen();
}
bootstrap();
