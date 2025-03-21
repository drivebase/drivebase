import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  keys?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
