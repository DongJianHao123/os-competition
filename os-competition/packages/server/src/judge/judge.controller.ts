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
  listProjects(@Query('page') page = 1, @Query('pageSize') pageSize = 10, @Query('search') search?: string, @Request() req?) {
    return this.judgeService.listProjects(+page, +pageSize, req.user.id, search);
  }

  @Get('projects/:id')
  getProject(@Param('id') id: string, @Request() req) {
    return this.judgeService.getProject(+id, req.user.id);
  }

  @Get('projects/:id/readme')
  getReadme(@Param('id') id: string) {
    return this.judgeService.getReadme(+id);
  }

  @Get('projects/:id/plagiarism')
  getPlagiarismFiles(@Param('id') id: string) {
    return this.judgeService.getPlagiarismFiles(+id);
  }

  @Get('projects/:id/commit-analysis')
  getCommitAnalysis(@Param('id') id: string) {
    return this.judgeService.getCommitAnalysis(+id);
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

  @Get('groups')
  listGroups(@Request() req) {
    return this.judgeService.listGroups(req.user.id);
  }

  @Get('groups/:id/projects')
  getGroupProjects(@Param('id') id: string, @Query('page') page = 1, @Query('pageSize') pageSize = 10, @Request() req, @Query('search') search?: string) {
    return this.judgeService.getGroupProjects(+id, req.user.id, +page, +pageSize, search);
  }
}
