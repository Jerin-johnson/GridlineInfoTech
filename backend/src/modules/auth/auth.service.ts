import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { REFRESH_TOKEN_REPOSITORY } from './constants/auth.constants';
import { GoogleLoginDto, LoginDto, RegisterDto } from './dto';
import {
  AuthenticatedUser,
  AuthResult,
  AuthTokens,
  JwtPayload,
} from './interfaces/auth.interfaces';
import type { IRefreshTokenRepository } from './interfaces/refresh-token-repository.interface';
import { GoogleAuthService } from './services/google-auth.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const newUser = await this.usersService.createLocalUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash,
    });

    const tokens = await this.generateTokenPair(newUser);
    return {
      user: this.sanitizeUser(newUser),
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.authProvider === 'google' && !user.passwordHash) {
      throw new UnauthorizedException(
        'This account was created with Google Sign-In. Please sign in with Google.',
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userId = this.getUserId(user);
    await this.usersService.updateLastLogin(userId);

    const tokens = await this.generateTokenPair(user);
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async googleLogin(dto: GoogleLoginDto): Promise<AuthResult> {
    const googlePayload = await this.googleAuthService.verifyIdToken(
      dto.credential,
    );

    let user = await this.usersService.findByEmail(googlePayload.email);

    if (user) {
      if (user.authProvider === 'local') {
        throw new ConflictException(
          'An account with this email already exists using password authentication. Please log in with your email and password.',
        );
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      const userId = this.getUserId(user);
      await this.usersService.updateLastLogin(userId);
    } else {
      user = await this.usersService.createGoogleUser({
        firstName: googlePayload.firstName,
        lastName: googlePayload.lastName,
        email: googlePayload.email,
        avatar: googlePayload.avatar,
        isEmailVerified: googlePayload.emailVerified,
      });
    }

    const tokens = await this.generateTokenPair(user);
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refreshTokens(rawRefreshToken: string): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenDoc =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!tokenDoc) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token reuse / theft detection
    if (tokenDoc.isRevoked) {
      await this.refreshTokenRepository.revokeFamily(tokenDoc.family);
      throw new UnauthorizedException(
        'Invalid session state detected. All sessions in this chain have been revoked. Please log in again.',
      );
    }

    if (new Date() > tokenDoc.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.usersService.findById(tokenDoc.userId.toString());
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account not found or deactivated');
    }

    // Revoke current token before issuing a new one in the same family
    await this.refreshTokenRepository.revokeByTokenHash(tokenHash);

    const tokens = await this.generateTokenPair(user, tokenDoc.family);
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async logout(rawRefreshToken?: string, userId?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.refreshTokenRepository.revokeByTokenHash(tokenHash);
    } else if (userId) {
      await this.refreshTokenRepository.revokeAllByUserId(userId);
    }
  }

  private async generateTokenPair(
    user: UserDocument,
    existingFamily?: string,
  ): Promise<AuthTokens> {
    const userId = this.getUserId(user);
    const payload: JwtPayload = {
      sub: userId,
      email: user.email,
      role: user.role,
    };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessExpiration = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
      '15m',
    );
    const refreshExpiration = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );

    const accessExpiresIn = this.parseDurationToMs(accessExpiration);
    const refreshExpiresIn = this.parseDurationToMs(refreshExpiration);

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiration,
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const family = existingFamily || crypto.randomUUID();
    const expiresAt = new Date(Date.now() + refreshExpiresIn);

    await this.refreshTokenRepository.create({
      userId,
      tokenHash,
      family,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      accessExpiresIn,
      refreshExpiresIn,
    };
  }

  private getUserId(user: UserDocument): string {
    if (user._id) {
      return user._id.toString();
    }
    return String(user.id);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseDurationToMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      return 15 * 60 * 1000; // default 15m
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }

  private sanitizeUser(user: UserDocument): AuthenticatedUser {
    return {
      id: this.getUserId(user),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
    };
  }
}
