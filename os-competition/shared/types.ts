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
