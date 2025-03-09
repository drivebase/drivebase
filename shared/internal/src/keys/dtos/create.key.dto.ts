import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ProviderType } from '@prisma/client';

export class CreateKeyDto {
  @IsEnum(ProviderType)
  type: ProviderType;

  @IsObject()
  @IsOptional()
  keys?: Record<string, string>;
}
