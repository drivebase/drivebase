import { IsOptional, IsString } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  name?: string;
}
