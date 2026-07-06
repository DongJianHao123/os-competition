import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
  UseInterceptors, UploadedFile, UploadedFiles, Res, Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
  listJudges(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('search') search?: string, @Query('judgeType') judgeType?: string) {
    return this.adminService.listJudges(+page, +pageSize, search, judgeType);
  }

  @Post('judges')
  createJudge(@Body() dto: { name: string; phone: string; password: string; judgeType: string }) {
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

  @Get('projects')
  listProjects(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('search') search?: string, @Query('type') type?: string, @Query('status') status?: string) {
    return this.adminService.listProjects(+page, +pageSize, search, type, status);
  }

  @Get('projects/:id')
  getProject(@Param('id') id: string) {
    return this.adminService.getProject(+id);
  }

  @Put('projects/:id')
  updateProject(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateProject(+id, dto);
  }

  @Delete('projects/:id')
  deleteProject(@Param('id') id: string) {
    return this.adminService.deleteProject(+id);
  }

  @Post('projects/import')
  @UseInterceptors(FileInterceptor('file'))
  async importProjects(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.adminService.importProjects(file.buffer, file.originalname, req.user.id);
  }

  @Get('import-logs')
  getImportLogs(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('search') search?: string) {
    return this.adminService.getImportLogs(+page, +pageSize, search);
  }

  @Get('reviews/summary')
  getReviewSummary(@Query('type') type?: string) {
    return this.adminService.getReviewSummary(type);
  }

  @Post('projects/:id/plagiarism')
  async uploadPlagiarism(@Param('id') id: string, @Body() body: { files: { filename: string; url: string }[] }) {
    return this.adminService.uploadPlagiarism(+id, body.files);
  }

  @Get('projects/:id/plagiarism')
  getPlagiarismFiles(@Param('id') id: string) {
    return this.adminService.getPlagiarismFiles(+id);
  }

  @Delete('projects/:id/plagiarism')
  deletePlagiarism(@Param('id') id: string) {
    return this.adminService.deletePlagiarism(+id);
  }

  @Post('projects/:id/commit-analysis')
  uploadCommitAnalysis(@Param('id') id: string, @Body() body: { filename: string; url: string }) {
    return this.adminService.uploadCommitAnalysis(+id, body);
  }

  @Get('projects/:id/commit-analysis')
  getCommitAnalysis(@Param('id') id: string) {
    return this.adminService.getCommitAnalysis(+id);
  }

  @Delete('projects/:id/commit-analysis')
  deleteCommitAnalysis(@Param('id') id: string) {
    return this.adminService.deleteCommitAnalysis(+id);
  }

  // --- 分组管理 ---
  @Get('groups')
  listGroups(@Query('type') type?: string) {
    return this.adminService.listGroups(type);
  }

  @Post('groups')
  createGroup(@Body() dto: { name: string; type: string }) {
    return this.adminService.createGroup(dto);
  }

  @Put('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: { name?: string; type?: string }) {
    return this.adminService.updateGroup(+id, dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string) {
    return this.adminService.deleteGroup(+id);
  }

  @Get('groups/:id')
  getGroup(@Param('id') id: string) {
    return this.adminService.getGroup(+id);
  }

  @Post('groups/:id/judges')
  addGroupJudges(@Param('id') id: string, @Body() body: { judgeIds: number[] }) {
    return this.adminService.addGroupJudges(+id, body.judgeIds);
  }

  @Delete('groups/:id/judges/:judgeId')
  removeGroupJudge(@Param('id') id: string, @Param('judgeId') judgeId: string) {
    return this.adminService.removeGroupJudge(+id, +judgeId);
  }

  @Post('groups/:id/projects')
  addGroupProjects(@Param('id') id: string, @Body() body: { projectIds: number[] }) {
    return this.adminService.addGroupProjects(+id, body.projectIds);
  }

  @Delete('groups/:id/projects/:projectId')
  removeGroupProject(@Param('id') id: string, @Param('projectId') projectId: string) {
    return this.adminService.removeGroupProject(+id, +projectId);
  }

  @Get('export')
  async exportReviews(@Res() res: Response) {
    const buffer = await this.adminService.exportReviews();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reviews.xlsx');
    res.send(buffer);
  }
}
