import { IsEnum, IsOptional, IsString } from 'class-validator';

import { ProviderType } from '../provider.entity';

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
