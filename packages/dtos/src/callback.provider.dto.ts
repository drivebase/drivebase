import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ProviderType } from '@prisma/client';

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
