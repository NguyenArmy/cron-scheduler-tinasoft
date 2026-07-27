import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email nay da duoc dang ky. Vui long dung email khac.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role:
          dto.email.toLowerCase() ===
          this.configService.get<string>('ADMIN_EMAIL')?.toLowerCase()
            ? 'ADMIN'
            : 'USER',
      },
    });

    return this.generateTokenResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoac mat khau khong dung.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Email hoac mat khau khong dung.');
    }

    return this.generateTokenResponse(user);
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  private generateTokenResponse(user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const secret: string =
      this.configService.get<string>('JWT_SECRET') ?? 'cron_scheduler_secret_key_2024';
    const expiresIn =
      (this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d') as StringValue;

    const token = this.jwtService.sign(payload, { secret, expiresIn });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
