import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { GoogleVerifiedPayload } from '../interfaces/auth.interfaces';

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly oauthClient: OAuth2Client;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
    this.oauthClient = new OAuth2Client(this.clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleVerifiedPayload> {
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      if (!payload.email || !payload.email_verified) {
        throw new UnauthorizedException(
          'Google account email is missing or not verified',
        );
      }

      return {
        email: payload.email,
        firstName: payload.given_name || 'Google',
        lastName: payload.family_name || 'User',
        avatar: payload.picture,
        emailVerified: payload.email_verified,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(
        `Google token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('Failed to verify Google token');
    }
  }
}
