import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('账号不存在或已被禁用');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('密码错误');
    }
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const token = this.jwtService.sign(payload);
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        judgeType: user.judgeType,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      judgeType: user.judgeType,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
