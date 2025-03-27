import { ProviderType } from '@drivebase/providers/provider.entity';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

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
