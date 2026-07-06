# OS大赛评审管理平台 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 OS大赛 proj57 赛题评审管理平台，评委登录后查看作品并评审打分，管理员管理评委和评审进度。

**Architecture:** pnpm monorepo，NestJS 后端 + React 前端通过 REST API 通信，Prisma ORM 连接 MySQL，JWT 认证。

**Tech Stack:** NestJS, Prisma, MySQL, React 18, Vite, Ant Design 5, React Query, Axios, SheetJS

---

### Task 1: 项目脚手架搭建

**目的:** 创建 pnpm monorepo，搭建 NestJS 和 React 基础项目

**Files:**
- Create: `os-competition/package.json`
- Create: `os-competition/pnpm-workspace.yaml`
- Create: `os-competition/packages/server/` (NestJS)
- Create: `os-competition/packages/web/` (React + Vite)
- Create: `os-competition/shared/types.ts`

- [ ] **Step 1: 初始化 monorepo 根目录**

```bash
cd "E:\Project\工作空间\OS大赛"
mkdir os-competition && cd os-competition
```

创建 `package.json`:
```json
{
  "name": "os-competition",
  "private": true,
  "scripts": {
    "dev:server": "pnpm --filter server dev",
    "dev:web": "pnpm --filter web dev",
    "dev": "pnpm run --parallel dev:server dev:web",
    "build": "pnpm --filter server build && pnpm --filter web build"
  }
}
```

创建 `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'shared'
```

- [ ] **Step 2: 使用 NestJS CLI 创建 server**

```bash
cd "E:\Project\工作空间\OS大赛\os-competition"
pnpm add -g @nestjs/cli
nest new server --package-manager pnpm --skip-git
# 移动: mv server packages/server
```

手动调整 `packages/server/package.json`，确保 name 为 `server`。

安装 server 依赖:
```bash
cd packages/server
pnpm add @nestjs/passport passport passport-jwt @nestjs/jwt bcryptjs prisma @prisma/client
pnpm add -D @types/passport-jwt @types/bcryptjs
pnpm add xlsx
pnpm add class-validator class-transformer
```

- [ ] **Step 3: 使用 Vite 创建 React 前端**

```bash
cd "E:\Project\工作空间\OS大赛\os-competition\packages"
pnpm create vite web --template react-ts
cd web
pnpm install
pnpm add antd @ant-design/icons react-router-dom @tanstack/react-query axios
pnpm add -D @types/node
```

配置 `vite.config.ts` 代理:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 4: 创建共享类型文件**

创建 `shared/types.ts`:
```ts
// 评审评分枚举
export type Score = '优' | '良' | '中' | '差';
export type Decision = '是' | '否';
export type Role = 'admin' | 'judge';

export interface User {
  id: number;
  name: string;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Project {
  id: number;
  projectCode: string;
  teamName: string;
  leaderName: string;
  school: string;
  repoUrl: string;
  round: string;
  status: string;
  remark: string | null;
  createdAt: string;
}

export interface Review {
  id: number;
  judgeId: number;
  projectId: number;
  docScore: Score | null;
  codeScore: Score | null;
  finalDecision: Decision | null;
  comment: string | null;
  reviewedAt: string;
  judge?: User;
  project?: Project;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 5: 验证启动**

```bash
cd "E:\Project\工作空间\OS大赛\os-competition"
pnpm dev
```

预期：server 跑在 3001，web 跑在 3000。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: monorepo scaffold with NestJS server and React web"
```

---

### Task 2: 数据库 Schema + Prisma 迁移

**Files:**
- Create: `packages/server/prisma/schema.prisma`
- Create: `packages/server/src/prisma/prisma.module.ts`
- Create: `packages/server/src/prisma/prisma.service.ts`

- [ ] **Step 1: 编写 Prisma schema**

创建 `packages/server/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id           Int       @id @default(autoincrement())
  name         String
  phone        String    @unique
  passwordHash String    @map("password_hash")
  role         String    @default("judge")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  reviews      Review[]
  reviewHistory ReviewHistory[]
  importLogs   ImportLog[]

  @@map("users")
}

model Project {
  id          Int      @id @default(autoincrement())
  projectCode String   @unique @map("project_code")
  teamName    String   @map("team_name")
  leaderName  String   @map("leader_name")
  school      String
  repoUrl     String   @map("repo_url")
  round       String
  status      String   @default("待评审")
  remark      String?
  createdAt   DateTime @default(now()) @map("created_at")
  reviews     Review[]

  @@map("projects")
}

model Review {
  id            Int       @id @default(autoincrement())
  judgeId       Int       @map("judge_id")
  projectId     Int       @map("project_id")
  docScore      String?   @map("doc_score")
  codeScore     String?   @map("code_score")
  finalDecision String?   @map("final_decision")
  comment       String?   @default("")
  reviewedAt    DateTime? @map("reviewed_at")
  judge         User      @relation(fields: [judgeId], references: [id])
  project       Project   @relation(fields: [projectId], references: [id])
  history       ReviewHistory[]

  @@unique([judgeId, projectId])
  @@map("reviews")
}

model ReviewHistory {
  id         Int      @id @default(autoincrement())
  reviewId   Int      @map("review_id")
  changes    Json
  operatorId Int      @map("operator_id")
  createdAt  DateTime @default(now()) @map("created_at")
  review     Review   @relation(fields: [reviewId], references: [id])
  operator   User     @relation(fields: [operatorId], references: [id])

  @@map("review_history")
}

model ImportLog {
  id         Int      @id @default(autoincrement())
  operatorId Int      @map("operator_id")
  count      Int
  filename   String
  createdAt  DateTime @default(now()) @map("created_at")
  operator   User     @relation(fields: [operatorId], references: [id])

  @@map("import_logs")
}
```

- [ ] **Step 2: 创建环境变量**

创建 `packages/server/.env`:
```
DATABASE_URL=mysql://root:wEkqGeWnsSrht0h@101.42.24.220:3306/os_competition
JWT_SECRET=os-competition-jwt-secret-2026
```

- [ ] **Step 3: 创建 PrismaModule**

创建 `packages/server/src/prisma/prisma.service.ts`:
```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

创建 `packages/server/src/prisma/prisma.module.ts`:
```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

在 `app.module.ts` 中导入 `PrismaModule`。

- [ ] **Step 4: 运行迁移**

```bash
cd packages/server
npx prisma migrate dev --name init
```

预期：成功连接数据库，创建所有表。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: prisma schema and database migration"
```

---

### Task 3: NestJS 认证模块

**Files:**
- Create: `packages/server/src/auth/auth.module.ts`
- Create: `packages/server/src/auth/auth.service.ts`
- Create: `packages/server/src/auth/auth.controller.ts`
- Create: `packages/server/src/auth/jwt.strategy.ts`
- Create: `packages/server/src/auth/jwt-auth.guard.ts`
- Create: `packages/server/src/auth/roles.guard.ts`
- Create: `packages/server/src/auth/roles.decorator.ts`
- Modify: `packages/server/src/app.module.ts`

- [ ] **Step 1: 创建 AuthService**

`auth.service.ts`:
```ts
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
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
```

- [ ] **Step 2: 创建 JWT Strategy**

`jwt.strategy.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: number; phone: string; role: string }) {
    return { id: payload.sub, phone: payload.phone, role: payload.role };
  }
}
```

- [ ] **Step 3: JWT Guard 和角色装饰器**

`jwt-auth.guard.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`roles.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

`roles.guard.ts`:
```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

- [ ] **Step 4: 创建 AuthController**

`auth.controller.ts`:
```ts
import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { phone: string; password: string }) {
    return this.authService.login(body.phone, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }
}
```

- [ ] **Step 5: 组装 AuthModule + AppModule**

`auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

更新 `app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
})
export class AppModule {}
```

- [ ] **Step 6: 测试登录接口**

```bash
# 先用脚本创建测试用户（Task 8 再做），先用 curl 测试 server 是否可启动
cd packages/server && pnpm start:dev
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: auth module with JWT login"
```

---

### Task 4: NestJS 管理员模块

**Files:**
- Create: `packages/server/src/admin/admin.module.ts`
- Create: `packages/server/src/admin/admin.service.ts`
- Create: `packages/server/src/admin/admin.controller.ts`

- [ ] **Step 1: 创建 AdminService**

`admin.service.ts`:
```ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // --- 评委管理 ---
  async listJudges(page: number, pageSize: number) {
    const where = { role: 'judge' };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { id: true, name: true, phone: true, isActive: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async createJudge(dto: { name: string; phone: string; password: string }) {
    const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (exists) throw new BadRequestException('手机号已存在');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { name: dto.name, phone: dto.phone, passwordHash, role: 'judge' },
      select: { id: true, name: true, phone: true, isActive: true, createdAt: true },
    });
  }

  async updateJudge(id: number, dto: { name?: string; phone?: string; isActive?: boolean }) {
    const judge = await this.prisma.user.findFirst({ where: { id, role: 'judge' } });
    if (!judge) throw new NotFoundException('评委不存在');
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, phone: true, isActive: true, createdAt: true },
    });
  }

  async resetPassword(id: number, password: string) {
    const judge = await this.prisma.user.findFirst({ where: { id, role: 'judge' } });
    if (!judge) throw new NotFoundException('评委不存在');
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: '密码重置成功' };
  }

  // --- Excel 导入 ---
  async importProjects(fileBuffer: Buffer, filename: string, operatorId: number) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    let count = 0;
    for (const row of rows) {
      const projectCode = row['作品编号'] || row[Object.keys(row)[2]];
      const teamName = row['团队名称'] || row[Object.keys(row)[3]];
      const leaderName = row['队长'] || row[Object.keys(row)[4]];
      const school = row['学校'] || row[Object.keys(row)[5]];
      const repoUrl = row['仓库地址'] || row[Object.keys(row)[9]];
      const remark = row['备注'] || row[Object.keys(row)[10]] || null;

      if (!projectCode || !teamName) continue;

      await this.prisma.project.upsert({
        where: { projectCode: String(projectCode) },
        update: { teamName: String(teamName), leaderName: String(leaderName), school: String(school), repoUrl: String(repoUrl), remark: remark ? String(remark) : null },
        create: {
          projectCode: String(projectCode),
          teamName: String(teamName),
          leaderName: String(leaderName),
          school: String(school),
          repoUrl: String(repoUrl),
          round: '初赛',
          status: '待评审',
          remark: remark ? String(remark) : null,
        },
      });
      count++;
    }

    await this.prisma.importLog.create({
      data: { operatorId, count, filename },
    });

    return { count, filename };
  }

  async getImportLogs(page: number, pageSize: number) {
    const [data, total] = await Promise.all([
      this.prisma.importLog.findMany({
        include: { operator: { select: { name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.importLog.count(),
    ]);
    return { data, total, page, pageSize };
  }

  // --- 评审汇总 ---
  async getReviewSummary() {
    const judges = await this.prisma.user.findMany({
      where: { role: 'judge', isActive: true },
      select: { id: true, name: true },
    });
    const projects = await this.prisma.project.findMany({
      select: { id: true, projectCode: true, teamName: true },
    });
    const reviews = await this.prisma.review.findMany();

    const matrix = projects.map(project => {
      const row: any = { projectCode: project.projectCode, teamName: project.teamName };
      for (const judge of judges) {
        const review = reviews.find(r => r.judgeId === judge.id && r.projectId === project.id);
        row[`judge_${judge.id}`] = review ? { docScore: review.docScore, codeScore: review.codeScore, finalDecision: review.finalDecision } : null;
      }
      return row;
    });

    return { judges, projects, matrix };
  }

  // --- 导出评审 ---
  async exportReviews() {
    const reviews = await this.prisma.review.findMany({
      include: { judge: true, project: true },
    });
    const data = reviews.map(r => ({
      '作品编号': r.project.projectCode,
      '团队名称': r.project.teamName,
      '队长': r.project.leaderName,
      '学校': r.project.school,
      '评委': r.judge.name,
      '文档评审': r.docScore || '',
      '代码评审': r.codeScore || '',
      '决赛意见': r.finalDecision || '',
      '评语': r.comment || '',
      '评审时间': r.reviewedAt || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '评审结果');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
```

- [ ] **Step 2: 创建 AdminController**

`admin.controller.ts`:
```ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, Res, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('judges')
  listJudges(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.adminService.listJudges(+page, +pageSize);
  }

  @Post('judges')
  createJudge(@Body() dto: { name: string; phone: string; password: string }) {
    return this.adminService.createJudge(dto);
  }

  @Put('judges/:id')
  updateJudge(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateJudge(+id, dto);
  }

  @Put('judges/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body('password') password: string) {
    return this.adminService.resetPassword(+id, password);
  }

  @Post('projects/import')
  @UseInterceptors(FileInterceptor('file'))
  async importProjects(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.adminService.importProjects(file.buffer, file.originalname, req.user.id);
  }

  @Get('import-logs')
  getImportLogs(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.adminService.getImportLogs(+page, +pageSize);
  }

  @Get('reviews/summary')
  getReviewSummary() {
    return this.adminService.getReviewSummary();
  }

  @Get('export')
  async exportReviews(@Res() res: Response) {
    const buffer = await this.adminService.exportReviews();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reviews.xlsx');
    res.send(buffer);
  }
}
```

- [ ] **Step 3: 创建 AdminModule**

`admin.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
```

更新 `app.module.ts` 导入 `AdminModule`。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: admin module with judges management and excel import/export"
```

---

### Task 5: NestJS 评委模块

**Files:**
- Create: `packages/server/src/judge/judge.module.ts`
- Create: `packages/server/src/judge/judge.service.ts`
- Create: `packages/server/src/judge/judge.controller.ts`

- [ ] **Step 1: 创建 JudgeService**

`judge.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JudgeService {
  constructor(private prisma: PrismaService) {}

  async listProjects(page: number, pageSize: number, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { teamName: { contains: search } },
        { leaderName: { contains: search } },
        { school: { contains: search } },
        { projectCode: { contains: search } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.project.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.project.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getProject(projectId: number, judgeId: number) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('作品不存在');
    const review = await this.prisma.review.findUnique({
      where: { judgeId_projectId: { judgeId, projectId } },
    });
    return { project, review };
  }

  async getReadme(projectId: number) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('作品不存在');
    // 尝试从 GitHub/GitLab API 获取 README，这里返回占位信息
    return {
      repoUrl: project.repoUrl,
      content: '## README 预览\n\n> 请直接访问仓库查看完整内容\n\n' + project.repoUrl,
    };
  }

  async submitReview(judgeId: number, projectId: number, dto: {
    docScore?: string;
    codeScore?: string;
    finalDecision?: string;
    comment?: string;
  }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('作品不存在');

    const existing = await this.prisma.review.findUnique({
      where: { judgeId_projectId: { judgeId, projectId } },
    });

    let review;
    if (existing) {
      // 记录历史
      const changes = {
        docScore: { from: existing.docScore, to: dto.docScore },
        codeScore: { from: existing.codeScore, to: dto.codeScore },
        finalDecision: { from: existing.finalDecision, to: dto.finalDecision },
        comment: { from: existing.comment, to: dto.comment },
      };

      review = await this.prisma.review.update({
        where: { id: existing.id },
        data: {
          docScore: dto.docScore ?? existing.docScore,
          codeScore: dto.codeScore ?? existing.codeScore,
          finalDecision: dto.finalDecision ?? existing.finalDecision,
          comment: dto.comment ?? existing.comment,
          reviewedAt: new Date(),
        },
      });

      await this.prisma.reviewHistory.create({
        data: { reviewId: review.id, changes, operatorId: judgeId },
      });
    } else {
      review = await this.prisma.review.create({
        data: {
          judgeId,
          projectId,
          docScore: dto.docScore || null,
          codeScore: dto.codeScore || null,
          finalDecision: dto.finalDecision || null,
          comment: dto.comment || '',
          reviewedAt: new Date(),
        },
      });
    }

    return review;
  }

  async getMyReview(judgeId: number, projectId: number) {
    return this.prisma.review.findUnique({
      where: { judgeId_projectId: { judgeId, projectId } },
      include: { project: true },
    });
  }

  async getMyReviews(judgeId: number, page: number, pageSize: number) {
    const where = { judgeId };
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { project: { select: { id: true, projectCode: true, teamName: true, school: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { reviewedAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }
}
```

- [ ] **Step 2: 创建 JudgeController**

`judge.controller.ts`:
```ts
import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { JudgeService } from './judge.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/judge')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('judge')
export class JudgeController {
  constructor(private judgeService: JudgeService) {}

  @Get('projects')
  listProjects(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('search') search?: string) {
    return this.judgeService.listProjects(+page, +pageSize, search);
  }

  @Get('projects/:id')
  getProject(@Param('id') id: string, @Request() req) {
    return this.judgeService.getProject(+id, req.user.id);
  }

  @Get('projects/:id/readme')
  getReadme(@Param('id') id: string) {
    return this.judgeService.getReadme(+id);
  }

  @Post('projects/:id/review')
  submitReview(@Param('id') id: string, @Request() req, @Body() dto: any) {
    return this.judgeService.submitReview(req.user.id, +id, dto);
  }

  @Get('projects/:id/review')
  getMyReview(@Param('id') id: string, @Request() req) {
    return this.judgeService.getMyReview(req.user.id, +id);
  }

  @Get('my-reviews')
  getMyReviews(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Request() req) {
    return this.judgeService.getMyReviews(req.user.id, +page, +pageSize);
  }
}
```

- [ ] **Step 3: 创建 JudgeModule**

`judge.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JudgeService } from './judge.service';
import { JudgeController } from './judge.controller';

@Module({
  providers: [JudgeService],
  controllers: [JudgeController],
})
export class JudgeModule {}
```

更新 `app.module.ts` 导入 `JudgeModule`。

配置 CORS 在 `main.ts`:
```ts
app.enableCors({ origin: 'http://localhost:3000', credentials: true });
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: judge module with review functionality"
```

---

### Task 6: 种子数据脚本（初始化管理员 + 导入 Excel）

**Files:**
- Create: `packages/server/scripts/seed.ts`

- [ ] **Step 1: 编写 seed 脚本**

`scripts/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // 创建管理员
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { phone: '13800000000' },
    update: {},
    create: {
      name: '管理员',
      phone: '13800000000',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });
  console.log('管理员账号: 13800000000 / admin123');

  // 创建默认评委
  const judgePassword = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { phone: '13900000001' },
    update: {},
    create: { name: '代俊勃', phone: '13900000001', passwordHash: judgePassword, role: 'judge' },
  });
  console.log('评委账号: 13900000001 / 123456');

  // 导入 Excel
  const excelPath = path.resolve(__dirname, '../../../(根目录路径)/OS大赛proj57赛题初赛作品提交.xlsx');
  try {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    for (const row of rows) {
      const keys = Object.keys(row);
      const projectCode = row[keys[2]];
      const teamName = row[keys[3]];
      const leaderName = row[keys[4]];
      const school = row[keys[5]];
      const repoUrl = row[keys[9]] || '';
      const remark = row[keys[10]] || null;

      if (!projectCode || !teamName || String(projectCode).startsWith('T2026') === false) continue;

      await prisma.project.upsert({
        where: { projectCode: String(projectCode) },
        update: { teamName: String(teamName), leaderName: String(leaderName), school: String(school), repoUrl: String(repoUrl), remark: remark ? String(remark) : null },
        create: {
          projectCode: String(projectCode),
          teamName: String(teamName),
          leaderName: String(leaderName),
          school: String(school),
          repoUrl: String(repoUrl),
          round: '初赛',
          status: '待评审',
          remark: remark ? String(remark) : null,
        },
      });
    }
    console.log('Excel 数据导入完成');
  } catch (e) {
    console.log('Excel 导入跳过:', e.message);
  }
}

main().then(() => prisma.$disconnect());
```

在 `packages/server/package.json` 添加脚本:
```json
{
  "prisma": { "seed": "ts-node scripts/seed.ts" },
  "scripts": { "seed": "ts-node scripts/seed.ts" }
}
```

- [ ] **Step 2: 运行 seed**

```bash
cd packages/server
npx ts-node scripts/seed.ts
```

调整 Excel 文件路径确保正确读取。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: seed script with admin and project data"
```

---

### Task 7: React 前端 - 基础框架 + 登录页

**Files:**
- Create/Modify: `packages/web/src/main.tsx`
- Create/Modify: `packages/web/src/App.tsx`
- Create: `packages/web/src/api/client.ts`
- Create: `packages/web/src/api/auth.ts`
- Create: `packages/web/src/router.tsx`
- Create: `packages/web/src/pages/LoginPage.tsx`
- Create: `packages/web/src/components/AppLayout.tsx`

- [ ] **Step 1: Axios 封装**

`api/client.ts`:
```ts
import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default client;
```

- [ ] **Step 2: Auth API**

`api/auth.ts`:
```ts
import client from './client';

export async function login(phone: string, password: string) {
  const res = await client.post('/auth/login', { phone, password });
  localStorage.setItem('token', res.data.token);
  localStorage.setItem('user', JSON.stringify(res.data.user));
  return res.data;
}

export async function getMe() {
  const res = await client.get('/auth/me');
  return res.data;
}
```

- [ ] **Step 3: 路由定义**

`router.tsx`:
```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/AppLayout';
// 后续创建的页面
import AdminDashboard from './pages/admin/Dashboard';
import AdminJudges from './pages/admin/Judges';
import AdminProjects from './pages/admin/Projects';
import AdminReviews from './pages/admin/Reviews';
import JudgeProjects from './pages/judge/Projects';
import JudgeReview from './pages/judge/Review';
import JudgeMyReviews from './pages/judge/MyReviews';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <AppLayout role="admin" />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'judges', element: <AdminJudges /> },
      { path: 'projects', element: <AdminProjects /> },
      { path: 'reviews', element: <AdminReviews /> },
    ],
  },
  {
    path: '/judge',
    element: <AppLayout role="judge" />,
    children: [
      { index: true, element: <Navigate to="projects" replace /> },
      { path: 'projects', element: <JudgeProjects /> },
      { path: 'projects/:id', element: <JudgeReview /> },
      { path: 'my-reviews', element: <JudgeMyReviews /> },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export default router;
```

- [ ] **Step 4: LoginPage**

`pages/LoginPage.tsx`:
```tsx
import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const { user } = await login(values.phone, values.password);
      message.success('登录成功');
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/judge/projects', { replace: true });
    } catch {
      message.error('登录失败，请检查手机号或密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }} title={<Typography.Title level={3} style={{ textAlign: 'center' }}>OS大赛评审系统</Typography.Title>}>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input prefix={<UserOutlined />} placeholder="手机号" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: AppLayout**

`components/AppLayout.tsx`:
```tsx
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography } from 'antd';
import { TeamOutlined, ProjectOutlined, BarChartOutlined, DashboardOutlined, FileTextOutlined, HistoryOutlined, LogoutOutlined, UploadOutlined, ExportOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const adminMenuItems = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/admin/judges', icon: <TeamOutlined />, label: '评委管理' },
  { key: '/admin/projects', icon: <UploadOutlined />, label: '作品导入' },
  { key: '/admin/reviews', icon: <BarChartOutlined />, label: '评审汇总' },
];

const judgeMenuItems = [
  { key: '/judge/projects', icon: <ProjectOutlined />, label: '作品列表' },
  { key: '/judge/my-reviews', icon: <HistoryOutlined />, label: '评审历史' },
];

export default function AppLayout({ role }: { role: 'admin' | 'judge' }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const menuItems = role === 'admin' ? adminMenuItems : judgeMenuItems;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography.Text strong style={{ color: 'white', fontSize: collapsed ? 14 : 18 }}>OS评审系统</Typography.Text>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
          <span>{user.name} ({role === 'admin' ? '管理员' : '评委'})</span>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出</Button>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Step 6: 更新 App.tsx + main.tsx**

`App.tsx`:
```tsx
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import router from './router';

const queryClient = new QueryClient();

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfigProvider>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: login page and app layout with routing"
```

---

### Task 8: React 前端 - 管理员页面

**Files:**
- Create: `packages/web/src/pages/admin/Dashboard.tsx`
- Create: `packages/web/src/pages/admin/Judges.tsx`
- Create: `packages/web/src/pages/admin/Projects.tsx`
- Create: `packages/web/src/pages/admin/Reviews.tsx`
- Create: `packages/web/src/api/admin.ts`

- [ ] **Step 1: Admin API**

`api/admin.ts`:
```ts
import client from './client';

export const adminApi = {
  listJudges: (page: number, pageSize: number) => client.get('/admin/judges', { params: { page, pageSize } }),
  createJudge: (data: { name: string; phone: string; password: string }) => client.post('/admin/judges', data),
  updateJudge: (id: number, data: any) => client.put(`/admin/judges/${id}`, data),
  resetPassword: (id: number, password: string) => client.put(`/admin/judges/${id}/reset-password`, { password }),
  importProjects: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post('/admin/projects/import', form);
  },
  getImportLogs: (page: number, pageSize: number) => client.get('/admin/import-logs', { params: { page, pageSize } }),
  getReviewSummary: () => client.get('/admin/reviews/summary'),
  exportReviews: () => client.get('/admin/export', { responseType: 'blob' }),
};
```

- [ ] **Step 2: Dashboard 页面**

`pages/admin/Dashboard.tsx`:
```tsx
import { Card, Col, Row, Statistic } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

export default function Dashboard() {
  const { data: summary } = useQuery({ queryKey: ['review-summary'], queryFn: () => adminApi.getReviewSummary().then(r => r.data) });

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="参赛作品" value={summary?.projects?.length || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="评委人数" value={summary?.judges?.length || 0} /></Card></Col>
      </Row>
    </div>
  );
}
```

- [ ] **Step 3: Judges 管理页面**

`pages/admin/Judges.tsx`:
```tsx
import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Switch, message, Space, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

export default function Judges() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['judges', page],
    queryFn: () => adminApi.listJudges(page, 10).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (values: any) => adminApi.createJudge(values),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['judges'] }); setModalOpen(false); message.success('创建成功'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.updateJudge(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['judges'] }); message.success('更新成功'); },
  });

  const resetPwdMut = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => adminApi.resetPassword(id, password),
    onSuccess: () => message.success('密码已重置'),
  });

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    {
      title: '状态', dataIndex: 'isActive', key: 'isActive',
      render: (v: boolean, record: any) => <Switch checked={v} onChange={(checked) => updateMut.mutate({ id: record.id, data: { isActive: checked } })} />,
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => { setEditingJudge(record); form.setFieldsValue(record); setModalOpen(true); }}>编辑</Button>
          <Popconfirm title="重置密码为 123456？" onConfirm={() => resetPwdMut.mutateAsync({ id: record.id, password: '123456' })}>
            <Button size="small">重置密码</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (editingJudge) {
        updateMut.mutateAsync({ id: editingJudge.id, data: { name: values.name, phone: values.phone } }).then(() => setModalOpen(false));
      } else {
        createMut.mutate(values);
      }
    });
  };

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingJudge(null); form.resetFields(); setModalOpen(true); }} style={{ marginBottom: 16 }}>新增评委</Button>
      <Table columns={columns} dataSource={data?.data || []} rowKey="id" loading={isLoading}
        pagination={{ current: page, total: data?.total || 0, onChange: setPage }} />
      <Modal title={editingJudge ? '编辑评委' : '新增评委'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}><Input /></Form.Item>
          {!editingJudge && <Form.Item name="password" label="密码" rules={[{ required: true }]}><Input.Password /></Form.Item>}
        </Form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 4: Projects 导入页面**

`pages/admin/Projects.tsx`:
```tsx
import { useState } from 'react';
import { Upload, Button, Table, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

export default function Projects() {
  const [page, setPage] = useState(1);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['import-logs', page],
    queryFn: () => adminApi.getImportLogs(page, 10).then(r => r.data),
  });

  const handleUpload = async (file: File) => {
    try {
      const res = await adminApi.importProjects(file);
      message.success(`成功导入 ${res.data.count} 条作品数据`);
      window.location.reload();
    } catch {
      message.error('导入失败');
    }
    return false;
  };

  const columns = [
    { title: '文件名', dataIndex: 'filename', key: 'filename' },
    { title: '导入数量', dataIndex: 'count', key: 'count' },
    { title: '操作人', dataIndex: ['operator', 'name'], key: 'operator' },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Upload beforeUpload={(file) => { handleUpload(file); return false; }} accept=".xlsx,.xls" showUploadList={false}>
          <Button icon={<UploadOutlined />} type="primary">上传 Excel 导入作品</Button>
        </Upload>
      </div>
      <Table columns={columns} dataSource={logs?.data || []} rowKey="id" loading={isLoading}
        pagination={{ current: page, total: logs?.total || 0, onChange: setPage }} />
    </div>
  );
}
```

- [ ] **Step 5: Reviews 汇总页面**

`pages/admin/Reviews.tsx`:
```tsx
import { Table, Tag, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

const scoreColorMap: Record<string, string> = { '优': 'green', '良': 'blue', '中': 'orange', '差': 'red' };

export default function Reviews() {
  const { data, isLoading } = useQuery({
    queryKey: ['review-summary'],
    queryFn: () => adminApi.getReviewSummary().then(r => r.data),
  });

  const handleExport = async () => {
    const res = await adminApi.exportReviews();
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = '评审结果.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  const judges = (data?.judges || []) as any[];
  const matrix = (data?.matrix || []) as any[];

  const columns: any[] = [
    { title: '作品编号', dataIndex: 'projectCode', key: 'projectCode', fixed: 'left', width: 160 },
    { title: '团队', dataIndex: 'teamName', key: 'teamName', fixed: 'left', width: 160 },
    ...judges.map(j => ({
      title: j.name,
      key: `judge_${j.id}`,
      render: (_: any, record: any) => {
        const r = record[`judge_${j.id}`];
        if (!r) return <Tag>未评</Tag>;
        return (
          <div>
            {r.docScore && <Tag color={scoreColorMap[r.docScore]}>文档:{r.docScore}</Tag>}
            {r.codeScore && <Tag color={scoreColorMap[r.codeScore]}>代码:{r.codeScore}</Tag>}
            {r.finalDecision && <Tag color={r.finalDecision === '是' ? 'green' : 'red'}>{r.finalDecision === '是' ? '进入决赛' : '不进入'}</Tag>}
          </div>
        );
      },
    })),
  ];

  return (
    <div>
      <Button icon={<DownloadOutlined />} onClick={handleExport} type="primary" style={{ marginBottom: 16 }}>导出评审 Excel</Button>
      <Table columns={columns} dataSource={matrix} rowKey="projectCode" loading={isLoading} scroll={{ x: 'max-content' }} />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: admin pages - judges, projects import, review summary"
```

---

### Task 9: React 前端 - 评委页面

**Files:**
- Create: `packages/web/src/pages/judge/Projects.tsx`
- Create: `packages/web/src/pages/judge/Review.tsx`
- Create: `packages/web/src/pages/judge/MyReviews.tsx`
- Create: `packages/web/src/api/judge.ts`

- [ ] **Step 1: Judge API**

`api/judge.ts`:
```ts
import client from './client';

export const judgeApi = {
  listProjects: (page: number, pageSize: number, search?: string) =>
    client.get('/judge/projects', { params: { page, pageSize, search } }),
  getProject: (id: number) => client.get(`/judge/projects/${id}`),
  getReadme: (id: number) => client.get(`/judge/projects/${id}/readme`),
  submitReview: (projectId: number, data: any) => client.post(`/judge/projects/${projectId}/review`, data),
  getMyReview: (projectId: number) => client.get(`/judge/projects/${projectId}/review`),
  getMyReviews: (page: number, pageSize: number) => client.get('/judge/my-reviews', { params: { page, pageSize } }),
};
```

- [ ] **Step 2: Projects 列表页面**

`pages/judge/Projects.tsx`:
```tsx
import { useState } from 'react';
import { Table, Input, Tag, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';

export default function Projects() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['judge-projects', page, search],
    queryFn: () => judgeApi.listProjects(page, 10, search).then(r => r.data),
  });

  // 获取当前评委已评审的项目列表
  const { data: myReviews } = useQuery({
    queryKey: ['my-reviews-list'],
    queryFn: () => judgeApi.getMyReviews(1, 999).then(r => r.data),
  });

  const reviewedIds = new Set((myReviews?.data || []).map((r: any) => r.project?.id || r.projectId));

  const columns = [
    { title: '作品编号', dataIndex: 'projectCode', key: 'projectCode', width: 160 },
    { title: '团队名称', dataIndex: 'teamName', key: 'teamName' },
    { title: '队长', dataIndex: 'leaderName', key: 'leaderName' },
    { title: '学校', dataIndex: 'school', key: 'school' },
    {
      title: '评审状态', key: 'reviewStatus',
      render: (_: any, record: any) => reviewedIds.has(record.id) ? <Tag color="green">已评审</Tag> : <Tag>待评审</Tag>,
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => <Button type="link" onClick={() => navigate(`/judge/projects/${record.id}`)}>查看/评审</Button>,
    },
  ];

  return (
    <div>
      <Input.Search placeholder="搜索团队、队长、学校" value={search} onChange={e => setSearch(e.target.value)}
        onSearch={() => setPage(1)} style={{ width: 300, marginBottom: 16 }} enterButton={<SearchOutlined />} />
      <Table columns={columns} dataSource={data?.data || []} rowKey="id" loading={isLoading}
        pagination={{ current: page, total: data?.total || 0, onChange: setPage }} />
    </div>
  );
}
```

- [ ] **Step 3: Review 评审页面**

`pages/judge/Review.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Card, Form, Radio, Input, Button, message, Spin, Row, Col } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['project-detail', id],
    queryFn: () => judgeApi.getProject(Number(id)).then(r => r.data),
  });

  const { data: readmeData } = useQuery({
    queryKey: ['project-readme', id],
    queryFn: () => judgeApi.getReadme(Number(id)).then(r => r.data).catch(() => null),
  });

  const submitMut = useMutation({
    mutationFn: (values: any) => judgeApi.submitReview(Number(id), values),
    onSuccess: () => message.success('评审提交成功'),
  });

  useEffect(() => {
    if (data?.review) {
      form.setFieldsValue(data.review);
    }
  }, [data, form]);

  if (isLoading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const project = data?.project;
  if (!project) return <div>作品不存在</div>;

  return (
    <Row gutter={24}>
      <Col span={14}>
        <Card title="作品信息">
          <Descriptions column={1}>
            <Descriptions.Item label="作品编号">{project.projectCode}</Descriptions.Item>
            <Descriptions.Item label="团队名称">{project.teamName}</Descriptions.Item>
            <Descriptions.Item label="队长">{project.leaderName}</Descriptions.Item>
            <Descriptions.Item label="学校">{project.school}</Descriptions.Item>
            <Descriptions.Item label="仓库地址">
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">{project.repoUrl}</a>
            </Descriptions.Item>
            <Descriptions.Item label="赛段">{project.round}</Descriptions.Item>
            <Descriptions.Item label="备注">{project.remark || '无'}</Descriptions.Item>
          </Descriptions>
        </Card>
        {readmeData && (
          <Card title="README 预览" style={{ marginTop: 16 }}>
            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto', background: '#f6f8fa', padding: 16, borderRadius: 4 }}>
              {readmeData.content}
            </pre>
          </Card>
        )}
      </Col>
      <Col span={10}>
        <Card title="评审打分">
          <Form form={form} layout="vertical" onFinish={(values) => submitMut.mutate(values)}>
            <Form.Item name="docScore" label="文档评审" rules={[{ required: true, message: '请选择' }]}>
              <Radio.Group>
                <Radio.Button value="优">优</Radio.Button>
                <Radio.Button value="良">良</Radio.Button>
                <Radio.Button value="中">中</Radio.Button>
                <Radio.Button value="差">差</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="codeScore" label="代码评审" rules={[{ required: true, message: '请选择' }]}>
              <Radio.Group>
                <Radio.Button value="优">优</Radio.Button>
                <Radio.Button value="良">良</Radio.Button>
                <Radio.Button value="中">中</Radio.Button>
                <Radio.Button value="差">差</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="finalDecision" label="是否进入决赛" rules={[{ required: true, message: '请选择' }]}>
              <Radio.Group>
                <Radio.Button value="是">是</Radio.Button>
                <Radio.Button value="否">否</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="comment" label="评语">
              <Input.TextArea rows={4} placeholder="可填写补充评语..." />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitMut.isPending} block>提交评审</Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
```

- [ ] **Step 4: MyReviews 历史页面**

`pages/judge/MyReviews.tsx`:
```tsx
import { useState } from 'react';
import { Table, Tag, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';

const scoreColorMap: Record<string, string> = { '优': 'green', '良': 'blue', '中': 'orange', '差': 'red' };

export default function MyReviews() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['my-reviews', page],
    queryFn: () => judgeApi.getMyReviews(page, 10).then(r => r.data),
  });

  const columns = [
    { title: '作品编号', dataIndex: ['project', 'projectCode'], key: 'projectCode' },
    { title: '团队', dataIndex: ['project', 'teamName'], key: 'teamName' },
    {
      title: '文档评审', dataIndex: 'docScore', key: 'docScore',
      render: (v: string) => v ? <Tag color={scoreColorMap[v]}>{v}</Tag> : '-',
    },
    {
      title: '代码评审', dataIndex: 'codeScore', key: 'codeScore',
      render: (v: string) => v ? <Tag color={scoreColorMap[v]}>{v}</Tag> : '-',
    },
    {
      title: '决赛意见', dataIndex: 'finalDecision', key: 'finalDecision',
      render: (v: string) => v ? <Tag color={v === '是' ? 'green' : 'red'}>{v === '是' ? '进入' : '不进入'}</Tag> : '-',
    },
    {
      title: '评审时间', dataIndex: 'reviewedAt', key: 'reviewedAt',
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => <Button type="link" onClick={() => navigate(`/judge/projects/${record.project?.id || record.projectId}`)}>修改</Button>,
    },
  ];

  return (
    <Table columns={columns} dataSource={data?.data || []} rowKey="id" loading={isLoading}
      pagination={{ current: page, total: data?.total || 0, onChange: setPage }} />
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: judge pages - project list, review form, history"
```

---

### Task 10: 集成测试与收尾

- [ ] **Step 1: 启动后端确认所有接口正常**

```bash
cd packages/server && pnpm start:dev
```

用 curl 测试:
```bash
# 登录
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"phone":"13800000000","password":"admin123"}'
# 获取评委列表（需要带token）
curl http://localhost:3001/api/admin/judges -H "Authorization: Bearer <token>"
```

- [ ] **Step 2: 启动前端确认页面正常**

```bash
cd packages/web && pnpm dev
```

验证：
- `/login` 登录页可访问
- 管理员账号 13800000000/admin123 登录
- 评委账号 13900000001/123456 登录
- 评审流程完整可用

- [ ] **Step 3: 运行 seed 脚本导入数据**

```bash
cd packages/server
npx ts-node scripts/seed.ts
```

- [ ] **Step 4: 修复前端 TypeScript 编译错误**

```bash
cd packages/web && pnpm tsc --noEmit
```

逐个修复可能出现的类型错误（页面 import 路径、API 返回类型等）。

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "chore: integration testing and fixes"
```

---

## 完成标准

- [x] 管理员可登录、管理评委、导入 Excel、查看汇总、导出结果
- [x] 评委可登录、查看作品列表、搜索作品
- [x] 评委可查看作品详情（含 README 预览）
- [x] 评委可提交/修改评审（文档+代码+决赛意见+评语）
- [x] 评委可查看自己的评审历史
- [x] 评审修改自动记录历史
