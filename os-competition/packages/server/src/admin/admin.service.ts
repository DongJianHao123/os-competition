import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listJudges(page: number, pageSize: number, search?: string, judgeType?: string) {
    const where: any = { role: 'judge' as const };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { school: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (judgeType) {
      where.judgeType = judgeType;
    }
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { id: true, name: true, phone: true, judgeType: true, school: true, email: true, isActive: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async createJudge(dto: { name: string; phone: string; password: string; judgeType: string; school?: string; email?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (exists) throw new BadRequestException('手机号已存在');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { name: dto.name, phone: dto.phone, passwordHash, role: 'judge', judgeType: dto.judgeType, school: dto.school, email: dto.email },
      select: { id: true, name: true, phone: true, judgeType: true, school: true, email: true, isActive: true, createdAt: true },
    });
  }

  async updateJudge(id: number, dto: { name?: string; phone?: string; isActive?: boolean; judgeType?: string; school?: string; email?: string }) {
    const judge = await this.prisma.user.findFirst({ where: { id, role: 'judge' } });
    if (!judge) throw new NotFoundException('评委不存在');
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, phone: true, judgeType: true, school: true, email: true, isActive: true, createdAt: true },
    });
  }

  async resetPassword(id: number, password: string) {
    const judge = await this.prisma.user.findFirst({ where: { id, role: 'judge' } });
    if (!judge) throw new NotFoundException('评委不存在');
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: '密码重置成功' };
  }

  async importProjects(fileBuffer: Buffer, filename: string, operatorId: number) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    let count = 0;
    for (const row of rows) {
      const keys = Object.keys(row);
      const projectCode = String(row[keys[2]] || '');
      const teamName = String(row[keys[3]] || '');
      const leaderName = String(row[keys[4]] || '');
      const school = String(row[keys[5]] || '');
      const repoUrl = String(row[keys[9]] || '');
      const remark = row[keys[10]] ? String(row[keys[10]]) : null;

      if (!projectCode || !projectCode.startsWith('T2026')) continue;

      await this.prisma.project.upsert({
        where: { projectCode },
        update: { teamName, leaderName, school, repoUrl, remark },
        create: {
          projectCode, teamName, leaderName, school, repoUrl,
          round: '初赛', status: '待评审', remark,
        },
      });
      count++;
    }

    await this.prisma.importLog.create({ data: { operatorId, count, filename } });
    return { count, filename };
  }

  async listProjects(page: number, pageSize: number, search?: string, type?: string, status?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { projectCode: { contains: search } },
        { teamName: { contains: search } },
        { leaderName: { contains: search } },
        { school: { contains: search } },
      ];
    }
    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }
    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getProject(id: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('作品不存在');
    return project;
  }

  async updateProject(id: number, dto: { teamName?: string; leaderName?: string; school?: string; repoUrl?: string; round?: string; type?: string; status?: string; remark?: string }) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('作品不存在');
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async deleteProject(id: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('作品不存在');
    await this.prisma.reviewHistory.deleteMany({ where: { review: { projectId: id } } });
    await this.prisma.review.deleteMany({ where: { projectId: id } });
    await this.prisma.plagiarismFile.deleteMany({ where: { projectId: id } });
    await this.prisma.project.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // --- 查重结果 ---
  async uploadPlagiarism(projectId: number, files: { filename: string; url: string }[]) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('作品不存在');

    // 先清旧数据
    await this.prisma.plagiarismFile.deleteMany({ where: { projectId } });

    const created: { id: number; filename: string; url: string }[] = [];
    for (const file of files) {
      const record = await this.prisma.plagiarismFile.create({
        data: { projectId, filename: file.filename, url: file.url },
      });
      created.push({ id: record.id, filename: record.filename, url: record.url });
    }

    return { count: created.length, files: created };
  }

  async getPlagiarismFiles(projectId: number) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('作品不存在');
    return this.prisma.plagiarismFile.findMany({
      where: { projectId },
      select: { id: true, filename: true, url: true, createdAt: true },
      orderBy: { filename: 'asc' },
    });
  }

  async deletePlagiarism(projectId: number) {
    await this.prisma.plagiarismFile.deleteMany({ where: { projectId } });
    return { message: '查重结果已清除' };
  }

  // --- 提交记录分析 ---
  async uploadCommitAnalysis(projectId: number, dto: { filename: string; url: string }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('作品不存在');

    await this.prisma.commitAnalysis.deleteMany({ where: { projectId } });

    const record = await this.prisma.commitAnalysis.create({
      data: { projectId, filename: dto.filename, url: dto.url },
    });
    return { id: record.id, filename: record.filename, url: record.url };
  }

  async getCommitAnalysis(projectId: number) {
    return this.prisma.commitAnalysis.findMany({
      where: { projectId },
      select: { id: true, filename: true, url: true, createdAt: true },
    });
  }

  async deleteCommitAnalysis(projectId: number) {
    await this.prisma.commitAnalysis.deleteMany({ where: { projectId } });
    return { message: '提交记录分析已清除' };
  }

  async getImportLogs(page: number, pageSize: number, search?: string) {
    const where: any = {};
    if (search) {
      where.filename = { contains: search };
    }
    const [data, total] = await Promise.all([
      this.prisma.importLog.findMany({
        where,
        include: { operator: { select: { name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.importLog.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getReviewSummary(type?: string) {
    const judges = await this.prisma.user.findMany({
      where: { role: 'judge', isActive: true },
      select: { id: true, name: true },
    });
    const projectWhere: any = {};
    if (type) {
      projectWhere.type = type;
    }
    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: { id: true, projectCode: true, teamName: true },
    });
    const reviews = await this.prisma.review.findMany();

    const matrix = projects.map((project) => {
      const row: any = { projectCode: project.projectCode, teamName: project.teamName };
      for (const judge of judges) {
        const review = reviews.find((r) => r.judgeId === judge.id && r.projectId === project.id);
        row[`judge_${judge.id}`] = review
          ? { docScore: review.docScore, codeScore: review.codeScore, finalDecision: review.finalDecision }
          : null;
      }
      return row;
    });

    return { judges, projects, matrix };
  }

  // --- 分组管理 ---
  async listGroups(type?: string) {
    const where: any = {};
    if (type) {
      where.type = type;
    }
    return this.prisma.reviewGroup.findMany({
      where,
      include: {
        _count: { select: { judges: true, projects: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGroup(dto: { name: string; type: string }) {
    return this.prisma.reviewGroup.create({ data: dto });
  }

  async updateGroup(id: number, dto: { name?: string; type?: string }) {
    return this.prisma.reviewGroup.update({ where: { id }, data: dto });
  }

  async deleteGroup(id: number) {
    await this.prisma.reviewGroup.delete({ where: { id } });
    return { message: '删除成功' };
  }

  async getGroup(id: number) {
    const group = await this.prisma.reviewGroup.findUnique({
      where: { id },
      include: {
        judges: { include: { judge: { select: { id: true, name: true, phone: true, judgeType: true, school: true, email: true } } } },
        projects: { select: { id: true, projectCode: true, teamName: true, leaderName: true, school: true, type: true, status: true } },
      },
    });
    if (!group) throw new NotFoundException('分组不存在');
    return group;
  }

  async addGroupJudges(groupId: number, judgeIds: number[]) {
    await this.prisma.groupJudge.createMany({
      data: judgeIds.map(judgeId => ({ groupId, judgeId })),
      skipDuplicates: true,
    });
    return this.getGroup(groupId);
  }

  async removeGroupJudge(groupId: number, judgeId: number) {
    await this.prisma.groupJudge.deleteMany({ where: { groupId, judgeId } });
    return this.getGroup(groupId);
  }

  async addGroupProjects(groupId: number, projectIds: number[]) {
    await this.prisma.project.updateMany({
      where: { id: { in: projectIds } },
      data: { groupId },
    });
    return this.getGroup(groupId);
  }

  async removeGroupProject(groupId: number, projectId: number) {
    await this.prisma.project.updateMany({
      where: { id: projectId, groupId },
      data: { groupId: null },
    });
    return this.getGroup(groupId);
  }

  async exportReviews() {
    const reviews = await this.prisma.review.findMany({
      include: { judge: true, project: true },
    });
    const data = reviews.map((r) => ({
      '作品编号': r.project.projectCode,
      '团队名称': r.project.teamName,
      '队长': r.project.leaderName,
      '学校': r.project.school,
      '评委': r.judge.name,
      '文档评审': r.docScore || '',
      '代码评审': r.codeScore || '',
      '决赛意见': r.finalDecision || '',
      '评语': r.comment || '',
      '评审时间': r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '评审结果');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }
}
