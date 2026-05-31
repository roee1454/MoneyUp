import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { AllExceptionsFilter, LoggingInterceptor } from '@money-up/common/backend';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.HOST ?? '0.0.0.0',
        port: Number(process.env.AUTH_SERVICE_PORT ?? 3003),
      },
    },
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Diagnostic memory logging
  setInterval(() => {
    const usage = process.memoryUsage();
    console.log(`[Auth Memory] RSS: ${Math.round(usage.rss / 1024 / 1024)}MB, Heap: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
  }, 60000);

  await app.listen();
}
bootstrap();
