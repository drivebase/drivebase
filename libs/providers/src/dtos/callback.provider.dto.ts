import { ProviderType } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CallbackProviderDto {
  @IsString()
  @IsNotEmpty()
  type: ProviderType;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  state?: string;
}
