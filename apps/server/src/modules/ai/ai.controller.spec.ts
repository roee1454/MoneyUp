import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { UsersService } from '../users/users.service';

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
        {
          provide: UsersService,
          useValue: {},
        },
      ],
    }).compile();

    controller = app.get<AiController>(AiController);
  });

  it('returns greeting message', async () => {
    expect(await controller.getAiGreeting()).toBe('AI gateway endpoint is ready');
  });
});
