import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter, LoggingInterceptor } from '@money-up/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.CLIENT_URL,
    ].filter(Boolean) as string[],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  await app.listen(process.env.GATEWAY_PORT ?? 3000);
}
bootstrap();
