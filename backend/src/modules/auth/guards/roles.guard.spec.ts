/// <reference types="jest" />
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  const createMockContext = (user?: { role: string }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('should return true if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ role: 'customer' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if empty roles array is configured', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = createMockContext({ role: 'customer' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if user has the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext({ role: 'admin' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if user has one of multiple allowed roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['admin', 'manager']);
    const context = createMockContext({ role: 'admin' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext({ role: 'customer' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException if no user is present on request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
