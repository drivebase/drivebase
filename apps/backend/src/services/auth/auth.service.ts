import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { UsersService } from '@drivebase/internal/users/users.service';
import { CreateUserDto } from '@drivebase/internal/auth/dtos/create.user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private _usersService: UsersService,
    private _jwtService: JwtService
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

  async login(user: User) {
    const payload = { sub: user.id, role: user.role };
    return {
      accessToken: this._jwtService.sign(payload),
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
}
