import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWorkspaceDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
