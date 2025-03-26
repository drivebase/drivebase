import { AuthService } from '@drivebase/auth/auth.service';
import { CreateUserDto } from '@drivebase/auth/dtos/create.user.dto';
import { LocalAuthGuard } from '@drivebase/auth/local-auth.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let authController: AuthController;

  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
  };

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: vi.fn(() => true) })
      .compile();

    authController = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register with correct parameters', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedResult = { ok: true };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await authController.register(createUserDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    it('should set cookie with access token and end response', () => {
      const req = { user: mockUser };
      const res = {
        cookie: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      const accessToken = 'test-token';
      mockAuthService.login.mockReturnValue({ accessToken });

      authController.login(req as any, res);

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.cookie).toHaveBeenCalledWith('accessToken', accessToken, {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('profile', () => {
    it('should return user object without password', () => {
      const result = authController.profile(mockUser);

      expect(result).toEqual({
        ...mockUser,
        password: undefined,
      });
    });
  });
});
