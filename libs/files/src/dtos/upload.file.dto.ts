import { IsString } from 'class-validator';

export class UploadFileDto {
  @IsString()
  providerId: string;

  @IsString()
  path: string;
}
