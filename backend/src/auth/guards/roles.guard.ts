import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../roles.decorator';
import type { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Ban chua dang nhap. Vui long dang nhap de tiep tuc.');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Ban khong co quyen thuc hien hanh dong nay. Quyen hien tai: "${user.role}", yeu cau: "${requiredRoles.join(', ')}"`,
      );
    }

    return true;
  }
}
