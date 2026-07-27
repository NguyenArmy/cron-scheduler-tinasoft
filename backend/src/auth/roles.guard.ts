import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu route không yêu cầu Role cụ thể -> Cho phép truy cập
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // Lấy Role từ thông tin user (đã được JwtStrategy xác thực và gán vào request.user)
    const user = request.user;
    
    if (!user || !user.role) {
      throw new ForbiddenException('Không thể xác thực quyền của người dùng!');
    }

    const userRole = user.role.toUpperCase() as Role;

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `Bạn không có quyền thực hiện hành động này! Quyền hiện tại: "${userRole}", Yêu cầu: "${requiredRoles.join(', ')}"`,
      );
    }

    return true;
  }
}
