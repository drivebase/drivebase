import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from '@xile/internal/dtos/auth/create.user.dto';
import { userProfile } from './users.validator';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(user: CreateUserDto) {
    return this.usersRepository.create(user);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async getPublicData(id: string) {
    return this.usersRepository.findById(id, userProfile.select);
  }
}
