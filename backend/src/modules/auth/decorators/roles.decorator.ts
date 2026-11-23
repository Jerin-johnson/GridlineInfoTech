import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/auth.constants';

export const Roles = (...roles: string[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
