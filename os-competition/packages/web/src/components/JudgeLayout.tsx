import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Button, Typography, Avatar, Dropdown, Space } from 'antd';
import {
  LogoutOutlined, UserOutlined, HomeOutlined,
  ApartmentOutlined, FileTextOutlined,
} from '@ant-design/icons';

const { Header, Content, Footer } = Layout;

const navItems = [
  { key: '/judge/groups', icon: <ApartmentOutlined />, label: '评审分组' },
];

export default function JudgeLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '0 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          lineHeight: '64px',
          boxShadow: '0 2px 12px rgba(102, 126, 234, 0.25)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          {/* Logo / Title */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => navigate('/judge/groups')}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#fff',
            }}>
              <HomeOutlined />
            </div>
            <Typography.Text
              strong
              style={{ color: '#fff', fontSize: 20, letterSpacing: 1, lineHeight: '64px' }}
            >
              OS 竞赛评审
            </Typography.Text>
          </div>

          {/* Navigation */}
          <nav style={{ display: 'flex', gap: 4 }}>
            {navItems.map((item) => (
              <Button
                key={item.key}
                type="text"
                icon={item.icon}
                onClick={() => navigate(item.key)}
                style={{
                  color: isActive(item.key) ? '#fff' : 'rgba(255,255,255,0.75)',
                  background: isActive(item.key) ? 'rgba(255,255,255,0.18)' : 'transparent',
                  fontWeight: isActive(item.key) ? 600 : 400,
                  height: 40,
                  fontSize: 15,
                  borderRadius: 8,
                  lineHeight: '40px',
                }}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>

        {/* User Info */}
        <Dropdown
          menu={{
            items: [
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: '退出登录',
                onClick: handleLogout,
              },
            ],
          }}
          placement="bottomRight"
        >
          <Space style={{ cursor: 'pointer', color: '#fff' }}>
            <Avatar
              icon={<UserOutlined />}
              style={{ background: 'rgba(255,255,255,0.25)' }}
              size="small"
            />
            <span style={{ fontSize: 14 }}>
              {user.name}
            </span>
            <Typography.Text
              style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}
            >
              ({user.judgeType || ''}评委)
            </Typography.Text>
          </Space>
        </Dropdown>
      </Header>

      <Content style={{ padding: '32px 48px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 32,
          minHeight: 'calc(100vh - 64px - 128px)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <Outlet />
        </div>
      </Content>

      <Footer style={{
        textAlign: 'center',
        color: '#999',
        background: '#f0f2f5',
        fontSize: 13,
        padding: '16px 48px',
      }}>
        OS 竞赛评审系统 &copy; {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}
