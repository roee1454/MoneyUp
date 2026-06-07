import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { of } from 'rxjs';

describe('Gateway (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('AI_SERVICE')
      .useValue({ send: () => of('Hello World!') })
      .overrideProvider('SCRAPER_SERVICE')
      .useValue({ send: () => of('Hello World!') })
      .overrideProvider('AUTH_SERVICE')
      .useValue({ send: () => of('pong') })
      .overrideProvider('USERS_SERVICE')
      .useValue({ send: () => of(null) });

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('healthy');
      });
  });

  it('/ai (GET)', () => {
    return request(app.getHttpServer())
      .get('/ai')
      .expect(200)
      .expect('AI gateway endpoint is ready');
  });
});
