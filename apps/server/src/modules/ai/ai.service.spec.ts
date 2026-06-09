import { InternalServerErrorException } from '@nestjs/common';
import { AiService } from './ai.service';
import type { ConfigService } from '@nestjs/config';

describe('AiService', () => {
  it('prefers custom API key when provided', () => {
    const configServiceMock = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new AiService(configServiceMock, {} as any, {} as any);

    const provider = service.getProvider('openai', 'custom-key');
    expect(provider).toBeDefined();
  });

  it('uses configured API key when custom key is missing', () => {
    const configServiceMock = {
      get: jest.fn().mockReturnValue('env-key'),
    } as unknown as ConfigService;
    const service = new AiService(configServiceMock, {} as any, {} as any);

    const provider = service.getProvider('gemini');
    expect(provider).toBeDefined();
  });

  it('throws when API key is not configured', () => {
    const configServiceMock = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new AiService(configServiceMock, {} as any, {} as any);

    expect(() => service.getProvider('claude')).toThrow(
      InternalServerErrorException,
    );
  });
});
