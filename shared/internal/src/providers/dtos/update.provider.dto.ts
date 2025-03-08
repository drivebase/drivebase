import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsString({ each: true })
  keys?: Record<string, any>;

  @IsOptional()
  @IsString({ each: true })
  credentials?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isConnected?: boolean;
}
