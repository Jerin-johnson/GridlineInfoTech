import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAMES } from './constants/auth.constants';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { GoogleLoginDto, LoginDto, RefreshTokenDto, RegisterDto } from './dto';
import { AuthResult } from './interfaces/auth.interfaces';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setTokenCookies(response, result);
    return {
      message: 'Registration successful',
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setTokenCookies(response, result);
    return {
      message: 'Login successful',
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.googleLogin(dto);
    this.setTokenCookies(response, result);
    return {
      message: 'Google authentication successful',
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      (request.cookies?.[AUTH_COOKIE_NAMES.REFRESH_TOKEN] as
        string | undefined) || dto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const result = await this.authService.refreshTokens(refreshToken);
    this.setTokenCookies(response, result);
    return {
      message: 'Token refreshed successfully',
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('sub') userId: string,
    @Req() request: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      (request.cookies?.[AUTH_COOKIE_NAMES.REFRESH_TOKEN] as
        string | undefined) || dto.refreshToken;

    await this.authService.logout(refreshToken, userId);
    this.clearTokenCookies(response);

    return {
      message: 'Logged out successfully',
    };
  }

  private setTokenCookies(response: Response, authResult: AuthResult): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const sameSite: 'strict' | 'lax' = isProduction ? 'strict' : 'lax';

    response.cookie(
      AUTH_COOKIE_NAMES.ACCESS_TOKEN,
      authResult.tokens.accessToken,
      {
        httpOnly: true,
        secure: isProduction,
        sameSite,
        path: '/',
        maxAge: authResult.tokens.accessExpiresIn,
      },
    );

    response.cookie(
      AUTH_COOKIE_NAMES.REFRESH_TOKEN,
      authResult.tokens.refreshToken,
      {
        httpOnly: true,
        secure: isProduction,
        sameSite,
        path: '/',
        maxAge: authResult.tokens.refreshExpiresIn,
      },
    );
  }

  private clearTokenCookies(response: Response): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const sameSite: 'strict' | 'lax' = isProduction ? 'strict' : 'lax';

    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/',
    };

    response.clearCookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN, clearOptions);
    response.clearCookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, clearOptions);
  }
}
