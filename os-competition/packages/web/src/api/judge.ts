import client from './client';

export const judgeApi = {
  listProjects: (page: number, pageSize: number, search?: string) =>
    client.get('/judge/projects', { params: { page, pageSize, search } }),
  getProject: (id: number) => client.get(`/judge/projects/${id}`),
  getReadme: (id: number) => client.get(`/judge/projects/${id}/readme`),
  submitReview: (projectId: number, data: any) =>
    client.post(`/judge/projects/${projectId}/review`, data),
  getMyReview: (projectId: number) => client.get(`/judge/projects/${projectId}/review`),
  getMyReviews: (page: number, pageSize: number) =>
    client.get('/judge/my-reviews', { params: { page, pageSize } }),
  getPlagiarismFiles: (projectId: number) =>
    client.get(`/judge/projects/${projectId}/plagiarism`),
  getCommitAnalysis: (projectId: number) =>
    client.get(`/judge/projects/${projectId}/commit-analysis`),
  getMyGroups: () => client.get('/judge/groups'),
  getGroupProjects: (groupId: number, page: number, pageSize: number, search?: string) =>
    client.get(`/judge/groups/${groupId}/projects`, { params: { page, pageSize, search } }),
};
