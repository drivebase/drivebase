import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Body,
} from '@nestjs/common';
import { LocalAuthGuard } from '@xilehq/backend/services/auth/local-auth.guard';
import { AuthService } from '@xilehq/backend/services/auth/auth.service';
import { JwtAuthGuard } from '@xilehq/backend/services/auth/jwt-auth.guard';
import { CreateUserDto } from '@xilehq/internal/dtos/auth/create.user.dto';
import { UserInRequest } from '@xilehq/internal/types/auth.types';
import { User } from '@prisma/client';
import { Public } from '@xilehq/backend/services/auth/auth.guard';
@Controller('auth')
export class AuthController {
  constructor(private _authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: CreateUserDto) {
    return this._authService.register(body);
  }

  @Public()
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
