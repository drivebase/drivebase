import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { KeysService } from '@drivebase/internal/keys/keys.service';
import { UpdateKeyDto } from '@drivebase/internal/keys/dtos/update.key.dto';
import { GetWorkspaceFromRequest } from '@drivebase/internal/workspaces/workspace.from.request';
import { Workspace } from '@prisma/client';
import { WorkspaceGuard } from '@drivebase/internal/workspaces/workspace.guard';

@Controller('keys')
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Get()
  @UseGuards(WorkspaceGuard)
  async findAll(@GetWorkspaceFromRequest() workspace: Workspace) {
    return this.keysService.findByWorkspaceId(workspace.id);
  }

  @Put()
  @UseGuards(WorkspaceGuard)
  async update(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Body() updateKeyDto: UpdateKeyDto
  ) {
    return this.keysService.saveKeys(
      workspace.id,
      updateKeyDto.type,
      updateKeyDto.keys
    );
  }
}
