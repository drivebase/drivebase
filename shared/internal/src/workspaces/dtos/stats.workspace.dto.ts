import { IsString } from 'class-validator';

export class WorkspaceStatDto {
  @IsString()
  title: string;

  @IsString()
  count: number;

  @IsString()
  size: number;
}
