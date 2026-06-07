import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authServiceController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            authenticate: jest.fn().mockReturnValue({ success: true, token: 'mock-token' }),
          },
        },
      ],
    }).compile();

    authServiceController = app.get<AuthController>(AuthController);
    authService = app.get<AuthService>(AuthService);
  });

  describe('root', () => {
    it('should return "pong" for ping', () => {
      expect(authServiceController.ping()).toBe('pong');
    });

    it('should call authenticate on authService', () => {
      const payload = { userId: '123', username: 'test' };
      authServiceController.authenticate(payload);
      expect(authService.authenticate).toHaveBeenCalledWith('123', 'test');
    });
  });
});

