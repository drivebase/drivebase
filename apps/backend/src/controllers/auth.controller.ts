import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Body,
  Response,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { LocalAuthGuard } from '@drivebase/backend/services/auth/local-auth.guard';
import { AuthService } from '@drivebase/backend/services/auth/auth.service';
import { CreateUserDto } from '@drivebase/dtos/create.user.dto';
import { Public } from '@drivebase/backend/services/auth/auth.guard';
import { GetUserFromRequest } from '@drivebase/backend/services/users/user.from.request';
import type { Response as ExpressResponse } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private _authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: CreateUserDto) {
    return this._authService.register(body);
  }

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(
    @Request() req: Request & { user: User },
    @Response() res: ExpressResponse,
  ) {
    const { accessToken } = await this._authService.login(req.user);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.end();
  }

  @Get('profile')
  async profile(@GetUserFromRequest() user: User) {
    delete user['password'];

    return user;
  }
}
