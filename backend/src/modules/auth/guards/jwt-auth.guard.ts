import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_COOKIE_NAMES, IS_PUBLIC_KEY } from '../constants/auth.constants';
import { JwtPayload } from '../interfaces/auth.interfaces';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (isPublic) {
      if (request) {
        const token = this.extractToken(request);
        if (token) {
          try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(
              token,
              {
                secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
              },
            );
            request.user = payload;
          } catch {
            // Optional auth: silently proceed without user on public endpoints
          }
        }
      }
      return true;
    }

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      request.user = payload;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }

    return true;
  }

  private extractToken(request: Request): string | null {
    if (!request) return null;

    // 1. Check HttpOnly cookie
    if (request.cookies?.[AUTH_COOKIE_NAMES.ACCESS_TOKEN]) {
      return request.cookies[AUTH_COOKIE_NAMES.ACCESS_TOKEN] as string;
    }

    // 2. Check Authorization Bearer header
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    return null;
  }
}
