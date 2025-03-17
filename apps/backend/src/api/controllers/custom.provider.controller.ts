import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  TelegramSendCodeDto,
  TelegramVerifyCodeDto,
  TelegramVerifyPasswordDto,
} from '@drivebase/internal/providers/custom/telegram/telegram.dto';
import { TelegramService } from '@drivebase/internal/providers/custom/telegram/telegram.service';
import { GetWorkspaceFromRequest } from '@drivebase/internal/workspaces/workspace.from.request';
import { Workspace } from '@prisma/client';
import { WorkspaceGuard } from '@drivebase/internal/workspaces/workspace.guard';

@Controller('custom-provider')
@UseGuards(WorkspaceGuard)
export class CustomProviderController {
  constructor(private readonly telegramService: TelegramService) {}

  // Telegram
  @Post('telegram/send-code')
  async telegramSendCode(
    @Body() body: TelegramSendCodeDto,
    @GetWorkspaceFromRequest() workspace: Workspace
  ) {
    return this.telegramService
      .sendCode(workspace.id, body.phoneNumber)
      .catch((err) => {
        throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
      });
  }

  @Post('telegram/verify-code')
  async telegramVerifyCode(
    @Body() body: TelegramVerifyCodeDto,
    @GetWorkspaceFromRequest() workspace: Workspace
  ) {
    return this.telegramService.verifyCode(workspace.id, body.code);
  }

  @Post('telegram/verify-password')
  async telegramVerifyPassword(
    @Body() body: TelegramVerifyPasswordDto,
    @GetWorkspaceFromRequest() workspace: Workspace
  ) {
    return this.telegramService.verifyPassword(workspace.id, body.password);
  }
}
