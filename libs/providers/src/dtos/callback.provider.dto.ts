import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ProviderType } from '../provider.entity';

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
