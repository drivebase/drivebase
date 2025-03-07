import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from '@xilehq/internal/dtos/auth/create.user.dto';
import { userProfile } from './users.validator';
import { Prisma } from '@prisma/client';
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(user: CreateUserDto) {
    return this.usersRepository.create(user);
  }

  async findById(id: string, select?: Prisma.UserSelect) {
    return this.usersRepository.findById(id, select);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async getPublicData(id: string) {
    return this.usersRepository.findById(id, userProfile.select);
  }
}
