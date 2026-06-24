import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

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
        {
          provide: UsersService,
          useValue: {},
        },
      ],
    }).compile();

    authServiceController = app.get<AuthController>(AuthController);
    authService = app.get<AuthService>(AuthService);
  });

  describe('logout', () => {
    it('clears cookie and returns success', () => {
      const mockResponse = {
        clearCookie: jest.fn(),
      } as any;
      expect(authServiceController.logout(mockResponse)).toEqual({ success: true });
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('moneyup_session', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });
    });
  });
});

