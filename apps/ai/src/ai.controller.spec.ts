import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let aiServiceController: AiController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [AiService],
    }).compile();

    aiServiceController = app.get<AiController>(AiController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(aiServiceController.getHelloMessage()).toBe('Hello World!');
    });
  });
});
