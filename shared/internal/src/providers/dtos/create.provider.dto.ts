import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ProviderType } from '@prisma/client';

export class CreateProviderDto {
  @IsString()
  alias: string;

  @IsEnum(ProviderType)
  type: ProviderType;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString({ each: true })
  keys?: Record<string, string>;

  @IsOptional()
  @IsString({ each: true })
  credentials?: Record<string, string>;
}
