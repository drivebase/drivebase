import { PrismaService } from '@drivebase/database/prisma.service';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { userProfile } from './users.validator';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: Prisma.UserCreateInput) {
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
