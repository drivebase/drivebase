import { User, UsersService } from '@drivebase/users';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { CreateUserDto } from './dtos/create.user.dto';

@Injectable()
export class AuthService {
  private codes = new Map<string, number>();
  private logger = new Logger(AuthService.name);

  constructor(
    private _usersService: UsersService,
    private _jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this._usersService.findByEmail(email);
    if (!user) {
      return null;
    }
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  login(user: User) {
    return {
      accessToken: this._jwtService.sign({
        sub: user.id,
      }),
    };
  }

  async register(user: CreateUserDto) {
    const existingUser = await this._usersService.findByEmail(user.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await this.hashPassword(user.password);
    await this._usersService.create({
      ...user,
      password: hashedPassword,
    });
    return {
      ok: true,
    };
  }

  hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async forgotPasswordSendCode(email: string) {
    const user = await this._usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const code = Math.floor(100000 + Math.random() * 900000);

    this.codes.set(email, code);
    this.logger.log(`Code ${code} sent to ${email}`);
  }

  forgotPasswordVerifyCode(email: string, code: number) {
    const userCode = this.codes.get(email);

    if (!userCode) {
      return false;
    }

    if (userCode !== code) {
      return false;
    }

    return true;
  }

  async forgotPasswordReset(email: string, code: number, password: string) {
    const user = await this._usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.forgotPasswordVerifyCode(email, code)) {
      throw new BadRequestException('Invalid code');
    }

    const hashedPassword = await this.hashPassword(password);

    await this._usersService.update(user.id, { password: hashedPassword });
    this.codes.delete(email);
    return true;
  }
}
