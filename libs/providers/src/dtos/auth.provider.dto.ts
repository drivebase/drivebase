import { IsNotEmpty, IsObject, IsString } from 'class-validator';

import { ProviderType } from '@drivebase/providers/provider.entity';

export class AuthorizeAPIProviderDto {
  @IsString()
  @IsNotEmpty()
  type: ProviderType;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsObject()
  @IsNotEmpty()
  credentials: Record<string, string>;
}
