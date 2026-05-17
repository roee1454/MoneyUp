import { NestFactory } from '@nestjs/core';
import { ScraperServiceModule } from './scraper-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ScraperServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
