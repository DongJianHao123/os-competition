import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Tag } from 'antd';
import {
  TeamOutlined, LogoutOutlined, UnorderedListOutlined, CrownOutlined, ApartmentOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const adminMenuItems = [
  { key: '/admin/projects-manage', icon: <UnorderedListOutlined />, label: '作品管理' },
  { key: '/admin/judges', icon: <TeamOutlined />, label: '评委管理' },
  { key: '/admin/groups', icon: <ApartmentOutlined />, label: '分组管理' },
];

const judgeMenuItems = [
  { key: '/judge/groups', icon: <ApartmentOutlined />, label: '评审分组' },
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
      <Sider
        collapsible collapsed={collapsed} onCollapse={setCollapsed}
        style={role === 'admin' ? { background: '#1a1a2e' } : undefined}
      >
        <div style={{
          height: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: role === 'admin' ? 'rgba(255,255,255,0.05)' : 'transparent',
          borderBottom: role === 'admin' ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}>
          <Typography.Text strong style={{ color: role === 'admin' ? '#e8c170' : 'white', fontSize: collapsed ? 14 : 18 }}>
            {role === 'admin' ? '超级后台' : 'OS评审系统'}
          </Typography.Text>
          {role === 'admin' && !collapsed && (
            <Tag color="gold" icon={<CrownOutlined />} style={{ marginTop: 2, fontSize: 11 }}>
              系统管理
            </Tag>
          )}
        </div>
        <Menu
          theme="dark" mode="inline" selectedKeys={[location.pathname]}
          items={menuItems} onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff', padding: '0 24px', display: 'flex',
          justifyContent: 'flex-end', alignItems: 'center', gap: 16,
        }}>
          <span>{user.name} ({role === 'admin' ? '超级后台' : `${user.judgeType || ''}评委`})</span>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出</Button>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
