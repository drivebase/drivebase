import { IsString, IsNotEmpty } from 'class-validator';

export class TelegramSendCodeDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class TelegramVerifyCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class TelegramVerifyPasswordDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
