import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { JudgeModule } from './judge/judge.module';

@Module({
  imports: [PrismaModule, AuthModule, AdminModule, JudgeModule],
})
export class AppModule {}
