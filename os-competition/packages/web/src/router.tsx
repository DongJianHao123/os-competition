import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/AppLayout';
import JudgeLayout from './components/JudgeLayout';
import AdminJudges from './pages/admin/Judges';
import AdminProjectsManage from './pages/admin/ProjectsManage';
import AdminGroupManage from './pages/admin/GroupManage';
import JudgeGroups from './pages/judge/Groups';
import JudgeGroupDetail from './pages/judge/GroupDetail';
import JudgeReview from './pages/judge/Review';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <AppLayout role="admin" />,
    children: [
      { index: true, element: <Navigate to="projects-manage" replace /> },
      { path: 'judges', element: <AdminJudges /> },
      { path: 'projects-manage', element: <AdminProjectsManage /> },
      { path: 'groups', element: <AdminGroupManage /> },
    ],
  },
  {
    path: '/judge',
    element: <JudgeLayout />,
    children: [
      { index: true, element: <Navigate to="groups" replace /> },
      { path: 'groups', element: <JudgeGroups /> },
      { path: 'groups/:id', element: <JudgeGroupDetail /> },
      { path: 'projects/:id', element: <JudgeReview /> },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export default router;
