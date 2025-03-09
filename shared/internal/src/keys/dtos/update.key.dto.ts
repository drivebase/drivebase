import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ProviderType } from '@prisma/client';

export class UpdateKeyDto {
  @IsEnum(ProviderType)
  @IsOptional()
  type?: ProviderType;

  @IsObject()
  @IsOptional()
  keys?: Record<string, string>;
}
