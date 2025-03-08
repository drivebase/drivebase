import { Injectable } from '@nestjs/common';
import type { Provider } from '@prisma/client';
import { CreateProviderDto } from '@xilehq/internal/providers/dtos/create.provider.dto';
import { UpdateProviderDto } from '@xilehq/internal/providers/dtos/update.provider.dto';
import { ProvidersRepository } from './providers.repository';

@Injectable()
export class ProvidersService {
  constructor(private readonly providersRepository: ProvidersRepository) {}

  async create(data: CreateProviderDto): Promise<Provider> {
    return this.providersRepository.create(data);
  }

  async findById(id: string): Promise<Provider | null> {
    return this.providersRepository.findById(id);
  }

  async findByUserId(userId: string): Promise<Provider[]> {
    return this.providersRepository.findByUserId(userId);
  }

  async update(id: string, data: UpdateProviderDto): Promise<Provider> {
    return this.providersRepository.update(id, data);
  }

  async delete(id: string): Promise<Provider> {
    return this.providersRepository.delete(id);
  }

  async findByUserIdAndType(
    userId: string,
    type: CreateProviderDto['type']
  ): Promise<Provider[]> {
    return this.providersRepository.findByUserIdAndType(userId, type);
  }
}
