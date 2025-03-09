import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CallbackProviderDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  state?: string;
}
