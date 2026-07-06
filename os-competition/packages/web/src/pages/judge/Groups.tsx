import { useNavigate } from 'react-router-dom';
import { Card, Tag, Typography, Row, Col, Skeleton } from 'antd';
import {
  ApartmentOutlined, ProjectOutlined, RightOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';

const { Title, Text } = Typography;

const typeConfig: Record<string, { color: string; gradient: string; icon: string }> = {
  '内核赛': { color: '#722ed1', gradient: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)', icon: '🖥️' },
  '功能赛': { color: '#13c2c2', gradient: 'linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%)', icon: '⚙️' },
};

export default function Groups() {
  const navigate = useNavigate();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['judge-groups'],
    queryFn: () => judgeApi.getMyGroups().then((r) => r.data),
  });

  const groupList = groups || [];

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
          <ApartmentOutlined style={{ marginRight: 10, color: '#667eea' }} />
          我的评审分组
        </Title>
        <Text type="secondary" style={{ fontSize: 15, marginTop: 4, display: 'block' }}>
          选择分组查看作品列表并开始评审
        </Text>
      </div>

      {/* Group Cards */}
      {isLoading ? (
        <Row gutter={[20, 20]}>
          {[1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} md={8} lg={6}>
              <Card style={{ borderRadius: 12, height: 200 }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : groupList.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 60, borderRadius: 12 }}>
          <ApartmentOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <div>
            <Text type="secondary" style={{ fontSize: 16 }}>
              暂无分配的分组
            </Text>
          </div>
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {groupList.map((group: any) => {
            const config = typeConfig[group.type] || typeConfig['功能赛'];
            return (
              <Col key={group.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  onClick={() => navigate(`/judge/groups/${group.id}`)}
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    height: '100%',
                    border: '1px solid #f0f0f0',
                    transition: 'all 0.3s ease',
                  }}
                  styles={{ body: { padding: 0 } }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {/* Card top gradient */}
                  <div style={{
                    height: 80,
                    background: config.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <span style={{ fontSize: 36 }}>{config.icon}</span>
                    <Tag
                      color={group.type === '内核赛' ? 'purple' : 'cyan'}
                      style={{ position: 'absolute', top: 10, right: 10, borderRadius: 6, fontWeight: 500 }}
                    >
                      {group.type}
                    </Tag>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '20px 20px 16px' }}>
                    <Title
                      level={5}
                      style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: 16 }}
                      ellipsis={{ tooltip: group.name }}
                    >
                      {group.name}
                    </Title>

                    <div style={{
                      background: '#fafafa',
                      borderRadius: 8,
                      padding: '10px 12px',
                      textAlign: 'center',
                    }}>
                      <ProjectOutlined style={{ color: '#52c41a', fontSize: 16, display: 'block', marginBottom: 4 }} />
                      <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
                        {group._count?.projects || 0}
                      </Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>个作品</Text>
                      </div>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div style={{
                    borderTop: '1px solid #f5f5f5',
                    padding: '10px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#999',
                  }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(group.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={{ color: '#1677ff', fontSize: 13, fontWeight: 500 }}>
                      进入分组 <RightOutlined style={{ fontSize: 10, marginLeft: 2 }} />
                    </Text>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
