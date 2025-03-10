import { Controller, Get } from '@nestjs/common';
import { ProvidersService } from '@drivebase/internal/providers/providers.service';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('available')
  async findAvailableProviders() {
    return this.providersService.findAvailableProviders();
  }
}
