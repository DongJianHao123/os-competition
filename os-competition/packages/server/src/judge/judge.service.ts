import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JudgeService {
  constructor(private prisma: PrismaService) {}

  async listProjects(page: number, pageSize: number, judgeId: number, search?: string) {
    const judge = await this.prisma.user.findUnique({ where: { id: judgeId } });
    const where: any = {};
    if (judge?.judgeType) {
      where.type = judge.judgeType;
    }
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
    return {
      repoUrl: project.repoUrl,
      content: `## README 预览\n\n> 仓库地址: ${project.repoUrl}\n\n> 请直接访问仓库查看完整内容`,
    };
  }

  async submitReview(
    judgeId: number,
    projectId: number,
    dto: { docScore?: string; codeScore?: string; finalDecision?: string; comment?: string },
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('作品不存在');

    const existing = await this.prisma.review.findUnique({
      where: { judgeId_projectId: { judgeId, projectId } },
    });

    let review;
    if (existing) {
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

  async getPlagiarismFiles(projectId: number) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('作品不存在');
    return this.prisma.plagiarismFile.findMany({
      where: { projectId },
      select: { id: true, filename: true, url: true, createdAt: true },
      orderBy: { filename: 'asc' },
    });
  }

  async getCommitAnalysis(projectId: number) {
    return this.prisma.commitAnalysis.findMany({
      where: { projectId },
      select: { id: true, filename: true, url: true, createdAt: true },
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

  async listGroups(judgeId: number) {
    const groupJudges = await this.prisma.groupJudge.findMany({
      where: { judgeId },
      include: {
        group: {
          include: {
            _count: { select: { judges: true, projects: true } },
          },
        },
      },
      orderBy: { group: { createdAt: 'desc' } },
    });
    return groupJudges.map(gj => gj.group);
  }

  async getGroupProjects(groupId: number, judgeId: number, page: number, pageSize: number) {
    const group = await this.prisma.reviewGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('分组不存在');
    const member = await this.prisma.groupJudge.findUnique({
      where: { groupId_judgeId: { groupId, judgeId } },
    });
    if (!member) throw new NotFoundException('您不属于该分组');
    const where: any = { groupId };
    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { data, total, page, pageSize, group };
  }
}
