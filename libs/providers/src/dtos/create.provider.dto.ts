import { ProviderType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @IsOptional()
  alias?: string;

  @IsEnum(ProviderType)
  type: ProviderType;

  @IsOptional()
  @IsString({ each: true })
  keys?: Record<string, string>;

  @IsOptional()
  @IsString({ each: true })
  credentials?: Record<string, string>;
}
