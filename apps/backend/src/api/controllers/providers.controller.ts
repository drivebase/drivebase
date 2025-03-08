import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ProvidersService } from '@xilehq/internal/providers/providers.service';
import { CreateProviderDto } from '@xilehq/internal/providers/dtos/create.provider.dto';
import { UpdateProviderDto } from '@xilehq/internal/providers/dtos/update.provider.dto';
import { UserInRequest } from '@xilehq/internal/types/auth.types';
import { ProviderType } from '@prisma/client';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  async create(
    @Body() createProviderDto: CreateProviderDto,
    @Request() req: Request & { user: UserInRequest }
  ) {
    return this.providersService.create({
      ...createProviderDto,
      userId: req.user.id,
    });
  }

  @Get()
  async findAll(@Request() req: Request & { user: UserInRequest }) {
    return this.providersService.findByUserId(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req: Request & { user: UserInRequest }
  ) {
    const provider = await this.providersService.findById(id);
    if (provider?.userId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this provider');
    }
    return provider;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
    @Request() req: Request & { user: UserInRequest }
  ) {
    const provider = await this.providersService.findById(id);
    if (provider?.userId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this provider');
    }
    return this.providersService.update(id, updateProviderDto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Request() req: Request & { user: UserInRequest }
  ) {
    const provider = await this.providersService.findById(id);
    if (provider?.userId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this provider');
    }
    return this.providersService.delete(id);
  }

  @Get('type/:type')
  async findByType(
    @Param('type') type: ProviderType,
    @Request() req: Request & { user: UserInRequest }
  ) {
    return this.providersService.findByUserIdAndType(req.user.id, type);
  }
}
