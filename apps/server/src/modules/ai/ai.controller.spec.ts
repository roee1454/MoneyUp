import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OllamaService } from './ollama.service';
import { UsersService } from '../users/users.service';

describe('AiController', () => {
  let controller: AiController;
  let service: jest.Mocked<AiService>;
  let ollamaService: jest.Mocked<OllamaService>;

  beforeEach(async () => {
    service = {} as jest.Mocked<AiService>;
    ollamaService = {} as jest.Mocked<OllamaService>;

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: service,
        },
        {
          provide: OllamaService,
          useValue: ollamaService,
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
