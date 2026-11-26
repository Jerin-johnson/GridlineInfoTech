export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

export interface SafeUserProfile extends AuthenticatedUser {
  authProvider: string;
  phone?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  user: AuthenticatedUser;
}

export interface UserProfileResponse {
  message: string;
  data: SafeUserProfile;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface GoogleAuthPayload {
  credential: string;
}
