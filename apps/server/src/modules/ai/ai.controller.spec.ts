import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let service: jest.Mocked<AiService>;

  beforeEach(async () => {
    service = {} as jest.Mocked<AiService>;

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: service,
        },
      ],
    }).compile();

    controller = app.get<AiController>(AiController);
  });

  it('returns pong on ping', () => {
    expect(controller.ping()).toBe('pong');
  });
});
