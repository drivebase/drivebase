import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isFolder?: boolean;

  @IsOptional()
  @IsString()
  parentPath?: string;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
