import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '@xilehq/backend/api/controllers/auth.controller';
import { AuthService } from '@xilehq/backend/services/auth/auth.service';
import { LocalStrategy } from '@xilehq/backend/services/auth/local.strategy';
import { JwtStrategy } from '@xilehq/backend/services/auth/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
})
export class ApiModule {}
