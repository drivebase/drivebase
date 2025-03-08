import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ProviderType } from '@prisma/client';

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
