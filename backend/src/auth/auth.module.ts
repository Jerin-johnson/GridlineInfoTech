import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { REFRESH_TOKEN_REPOSITORY } from './constants/auth.constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MongoRefreshTokenRepository } from './repositories/mongo-refresh-token.repository';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import { GoogleAuthService } from './services/google-auth.service';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleAuthService,
    JwtAuthGuard,
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: MongoRefreshTokenRepository,
    },
  ],
  exports: [AuthService, JwtAuthGuard, JwtModule, GoogleAuthService],
})
export class AuthModule {}
