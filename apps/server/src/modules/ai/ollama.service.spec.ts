import { Test, TestingModule } from '@nestjs/testing';
import { OllamaService } from './ollama.service';
import { AiService } from './ai.service';

describe('OllamaService', () => {
  let service: OllamaService;
  let aiServiceMock: any;
  let ollamaProviderMock: any;

  beforeEach(async () => {
    ollamaProviderMock = {
      getLoadedModels: jest.fn(),
      startModel: jest.fn(),
      stopModel: jest.fn(),
    };

    aiServiceMock = {
      getProvider: jest.fn().mockReturnValue(ollamaProviderMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OllamaService,
        {
          provide: AiService,
          useValue: aiServiceMock,
        },
      ],
    }).compile();

    service = module.get<OllamaService>(OllamaService);
  });

  it('should list running models', async () => {
    ollamaProviderMock.getLoadedModels.mockResolvedValue(['llama3']);
    const result = await service.getOllamaRunningModels();
    expect(result).toEqual(['llama3']);
    expect(aiServiceMock.getProvider).toHaveBeenCalledWith('ollama', undefined);
  });

  it('should start model', async () => {
    ollamaProviderMock.startModel.mockResolvedValue(true);
    const result = await service.startOllamaModel('llama3');
    expect(result).toBe(true);
    expect(ollamaProviderMock.startModel).toHaveBeenCalledWith('llama3');
  });

  it('should stop model', async () => {
    ollamaProviderMock.stopModel.mockResolvedValue(true);
    const result = await service.stopOllamaModel('llama3');
    expect(result).toBe(true);
    expect(ollamaProviderMock.stopModel).toHaveBeenCalledWith('llama3');
  });
});
