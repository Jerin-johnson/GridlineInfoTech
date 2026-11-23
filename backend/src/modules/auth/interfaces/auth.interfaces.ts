export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number; // in milliseconds
  refreshExpiresIn: number; // in milliseconds
}

export interface AuthResult {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}

export interface GoogleVerifiedPayload {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  emailVerified: boolean;
}

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
}
