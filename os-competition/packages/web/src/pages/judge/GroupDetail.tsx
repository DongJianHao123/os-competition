import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Input, Tag, Button, Typography, Card, Space, Progress } from 'antd';
import {
  ArrowLeftOutlined, SearchOutlined, TrophyOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';

const { Title, Text } = Typography;

const typeGradient: Record<string, string> = {
  '内核赛': 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
  '功能赛': 'linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%)',
};

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['judge-group-projects', id, page, search],
    queryFn: () => judgeApi.getGroupProjects(Number(id), page, 10, search || undefined).then((r) => r.data),
  });

  const { data: myReviews } = useQuery({
    queryKey: ['my-reviews-list'],
    queryFn: () => judgeApi.getMyReviews(1, 999).then((r) => r.data),
  });

  const reviewedIds = new Set(
    (myReviews?.data || []).map((r: any) => r.project?.id || r.projectId),
  );

  const group = data?.group;
  const totalProjects = data?.total || 0;
  const reviewedCount = (data?.data || []).filter((p: any) => reviewedIds.has(p.id)).length;
  const reviewProgress = totalProjects > 0 ? Math.round((reviewedCount / totalProjects) * 100) : 0;

  const columns = [
    {
      title: '作品编号', dataIndex: 'projectCode', key: 'projectCode', width: 170,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    { title: '团队名称', dataIndex: 'teamName', key: 'teamName', width: 180 },
    { title: '队长', dataIndex: 'leaderName', key: 'leaderName', width: 100 },
    { title: '学校', dataIndex: 'school', key: 'school', ellipsis: true },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 90,
      render: (v: string) => (
        <Tag color={v === '内核赛' ? 'purple' : 'cyan'} style={{ borderRadius: 6 }}>{v || '功能赛'}</Tag>
      ),
    },
  ];

  return (
    <div>
      {/* Back button + Header */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/judge/groups')}
        style={{ marginBottom: 20, padding: '4px 8px', fontSize: 14, color: '#666' }}
      >
        返回分组列表
      </Button>

      {/* Group Header Banner */}
      {group && (
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 12,
            background: typeGradient[group.type] || typeGradient['功能赛'],
            border: 'none',
          }}
          styles={{ body: { padding: '24px 28px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
                <TrophyOutlined style={{ marginRight: 10, color: group.type === '内核赛' ? '#722ed1' : '#13c2c2' }} />
                {group.name}
              </Title>
              <Space style={{ marginTop: 8 }}>
                <Tag
                  color={group.type === '内核赛' ? 'purple' : 'cyan'}
                  style={{ borderRadius: 6, fontSize: 13, padding: '2px 12px' }}
                >
                  {group.type}
                </Tag>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {new Date(group.createdAt).toLocaleDateString()}
                </Text>
              </Space>
            </div>
            {/* Review Progress */}
            <div style={{ textAlign: 'center', minWidth: 160 }}>
              <Progress
                type="circle"
                percent={reviewProgress}
                size={72}
                strokeColor={reviewProgress === 100 ? '#52c41a' : '#1677ff'}
                format={(pct) => (
                  <span style={{ fontSize: 18, fontWeight: 700 }}>
                    {pct}%
                  </span>
                )}
              />
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  已完成 {reviewedCount}/{totalProjects}
                </Text>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Projects List */}
      <Card
        title={
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            <TrophyOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
            作品列表
          </span>
        }
        extra={
          <Text type="secondary">
            共 {totalProjects} 个作品
          </Text>
        }
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Input.Search
          placeholder="搜索团队、队长、学校、编号"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => setPage(1)}
          style={{ width: 340, marginBottom: 16 }}
          enterButton={<><SearchOutlined /> 搜索</>}
          size="middle"
        />
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total: totalProjects,
            onChange: setPage,
            showTotal: (t) => `共 ${t} 条`,
          }}
          onRow={(record: any) => ({
            onClick: () => navigate(`/judge/projects/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

    </div>
  );
}
