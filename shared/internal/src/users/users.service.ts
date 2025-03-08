import { Injectable } from '@nestjs/common';
import { PrismaService } from '@xilehq/internal/prisma.service';
import { CreateUserDto } from '@xilehq/internal/auth/dtos/create.user.dto';
import { userProfile } from './users.validator';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: CreateUserDto) {
    return this.prisma.user.create({
      data: user,
    });
  }

  async findById(id: string, select?: Prisma.UserSelect) {
    return this.prisma.user.findUnique({
      where: { id },
      select,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async getPublicData(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userProfile.select,
    });
  }
}
