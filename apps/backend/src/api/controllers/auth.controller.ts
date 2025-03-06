import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Body,
} from '@nestjs/common';
import { LocalAuthGuard } from '@xile/backend/services/auth/local-auth.guard';
import { AuthService } from '@xile/backend/services/auth/auth.service';
import { JwtAuthGuard } from '@xile/backend/services/auth/jwt-auth.guard';
import { CreateUserDto } from '@xile/internal/dtos/auth/create.user.dto';
import { UserInRequest } from '@xile/internal/types/auth.types';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private _authService: AuthService) {}

  @Post('register')
  async register(@Body() body: CreateUserDto) {
    return this._authService.register(body);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: Request & { user: User }) {
    return this._authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@Request() req: Request & { user: UserInRequest }) {
    return req.user;
  }
}
