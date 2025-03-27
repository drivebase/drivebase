import { User } from '@drivebase/users';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { AuthService } from './auth.service';
import {
  ForgotPasswordResetInput,
  ForgotPasswordSendCodeInput,
  ForgotPasswordVerifyCodeInput,
  LoginInput,
  RegisterInput,
} from './dtos/auth.input';
import {
  ForgotPasswordResponse,
  LoginResponse,
  RegisterResponse,
  VerifyCodeResponse,
} from './dtos/auth.response';
import { GqlAuthGuard } from './gql-auth.guard';
import { CurrentUser } from './user.decorator';

@Resolver('Auth')
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => LoginResponse)
  @UseGuards(GqlAuthGuard)
  login(
    @Args('input') _: LoginInput,
    @CurrentUser() user: User,
  ): Promise<LoginResponse> {
    return Promise.resolve(this.authService.login(user));
  }

  @Mutation(() => RegisterResponse)
  register(@Args('input') input: RegisterInput): Promise<RegisterResponse> {
    return Promise.resolve(this.authService.register(input));
  }

  @Mutation(() => ForgotPasswordResponse)
  async forgotPasswordSendCode(
    @Args('input') input: ForgotPasswordSendCodeInput,
  ): Promise<ForgotPasswordResponse> {
    await this.authService.forgotPasswordSendCode(input.email);
    return Promise.resolve({ ok: true });
  }

  @Mutation(() => VerifyCodeResponse)
  async forgotPasswordVerifyCode(
    @Args('input') input: ForgotPasswordVerifyCodeInput,
  ): Promise<VerifyCodeResponse> {
    const ok = this.authService.forgotPasswordVerifyCode(
      input.email,
      input.code,
    );
    return Promise.resolve({ ok });
  }

  @Mutation(() => ForgotPasswordResponse)
  async forgotPasswordReset(
    @Args('input') input: ForgotPasswordResetInput,
  ): Promise<ForgotPasswordResponse> {
    const ok = await this.authService.forgotPasswordReset(
      input.email,
      input.code,
      input.password,
    );
    return Promise.resolve({ ok });
  }
}
