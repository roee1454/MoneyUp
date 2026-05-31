import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UsersModule } from './users.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UsersModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.HOST ?? '0.0.0.0',
        port: Number(process.env.USERS_SERVICE_PORT ?? 3004),
      },
    },
  );

  // Diagnostic memory logging
  setInterval(() => {
    const usage = process.memoryUsage();
    console.log(`[Users Memory] RSS: ${Math.round(usage.rss / 1024 / 1024)}MB, Heap: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
  }, 60000);

  await app.listen();
}

bootstrap();
