import client from './client';

export const adminApi = {
  listJudges: (page: number, pageSize: number) =>
    client.get('/admin/judges', { params: { page, pageSize } }),
  createJudge: (data: { name: string; phone: string; password: string }) =>
    client.post('/admin/judges', data),
  updateJudge: (id: number, data: any) =>
    client.put(`/admin/judges/${id}`, data),
  resetPassword: (id: number, password: string) =>
    client.put(`/admin/judges/${id}/reset-password`, { password }),
  importProjects: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post('/admin/projects/import', form);
  },
  getImportLogs: (page: number, pageSize: number) =>
    client.get('/admin/import-logs', { params: { page, pageSize } }),
  getReviewSummary: () => client.get('/admin/reviews/summary'),
  exportReviews: () => client.get('/admin/export', { responseType: 'blob' }),
  listProjects: (page: number, pageSize: number, search?: string) =>
    client.get('/admin/projects', { params: { page, pageSize, search } }),
  getProject: (id: number) => client.get(`/admin/projects/${id}`),
  updateProject: (id: number, data: any) => client.put(`/admin/projects/${id}`, data),
  deleteProject: (id: number) => client.delete(`/admin/projects/${id}`),
  uploadPlagiarism: (projectId: number, files: { filename: string; url: string }[]) =>
    client.post(`/admin/projects/${projectId}/plagiarism`, { files }),
  getPlagiarismFiles: (projectId: number) =>
    client.get(`/admin/projects/${projectId}/plagiarism`),
  deletePlagiarism: (projectId: number) =>
    client.delete(`/admin/projects/${projectId}/plagiarism`),
  uploadCommitAnalysis: (projectId: number, data: { filename: string; url: string }) =>
    client.post(`/admin/projects/${projectId}/commit-analysis`, data),
  getCommitAnalysis: (projectId: number) =>
    client.get(`/admin/projects/${projectId}/commit-analysis`),
  deleteCommitAnalysis: (projectId: number) =>
    client.delete(`/admin/projects/${projectId}/commit-analysis`),
  listGroups: () => client.get('/admin/groups'),
  createGroup: (data: { name: string; type: string }) => client.post('/admin/groups', data),
  updateGroup: (id: number, data: { name?: string; type?: string }) =>
    client.put(`/admin/groups/${id}`, data),
  deleteGroup: (id: number) => client.delete(`/admin/groups/${id}`),
  getGroup: (id: number) => client.get(`/admin/groups/${id}`),
  addGroupJudges: (groupId: number, judgeIds: number[]) =>
    client.post(`/admin/groups/${groupId}/judges`, { judgeIds }),
  removeGroupJudge: (groupId: number, judgeId: number) =>
    client.delete(`/admin/groups/${groupId}/judges/${judgeId}`),
  addGroupProjects: (groupId: number, projectIds: number[]) =>
    client.post(`/admin/groups/${groupId}/projects`, { projectIds }),
  removeGroupProject: (groupId: number, projectId: number) =>
    client.delete(`/admin/groups/${groupId}/projects/${projectId}`),
};
