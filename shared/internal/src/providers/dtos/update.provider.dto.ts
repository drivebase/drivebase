import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsString({ each: true })
  keys?: Record<string, string>;

  @IsOptional()
  @IsString({ each: true })
  credentials?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
