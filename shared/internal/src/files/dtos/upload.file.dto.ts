import { IsString } from 'class-validator';

export class UploadFileDto {
  @IsString()
  accountId: string;

  @IsString()
  path: string;
}
