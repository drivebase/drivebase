import { Public } from '@drivebase/auth/auth.guard';
import { AuthService } from '@drivebase/auth/auth.service';
import { CreateUserDto } from '@drivebase/auth/dtos/create.user.dto';
import { LocalAuthGuard } from '@drivebase/auth/local-auth.guard';
import { GetUserFromRequest } from '@drivebase/users/user.from.request';
import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';
import type { Response as ExpressResponse } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private _authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() body: CreateUserDto) {
    return this._authService.register(body);
  }

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(
    @Request() req: Request & { user: User },
    @Response() res: ExpressResponse,
  ) {
    const { accessToken } = this._authService.login(req.user);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.end();
  }

  @Get('profile')
  profile(@GetUserFromRequest() user: User) {
    return {
      ...user,
      password: undefined,
    };
  }
}
