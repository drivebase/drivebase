import {
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OAuthConfig } from '../provider.interface';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OAuthConfig)
  keys?: OAuthConfig;

  @IsOptional()
  @IsString({ each: true })
  credentials?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
