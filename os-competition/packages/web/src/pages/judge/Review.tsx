import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Card, Spin, Tabs, Tag, Button, Typography } from 'antd';
import {
  ArrowLeftOutlined, FileSearchOutlined,
  CodeOutlined, InfoCircleOutlined,
  LinkOutlined, TeamOutlined, HomeOutlined, TrophyOutlined,
  OrderedListOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';
import MarkdownViewer from '../../components/MarkdownViewer';

const { Title, Text } = Typography;

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['project-detail', id],
    queryFn: () => judgeApi.getProject(Number(id)).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 120 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  const project = data?.project;
  if (!project) return <div>作品不存在</div>;

  const isFeature = project.type?.startsWith('功能赛');
  const rankUrl = 'https://course.educg.net/pages/contest/contest_rank.jsp?contestID=Z7zWWwTfti0&my=false&contestCID=0#contestSubAn';

  const tabItems = isFeature
    ? [{
        key: 'commit',
        label: <span><CodeOutlined /> 代码提交分析</span>,
        children: (
          <MarkdownViewer
            projectId={project.id}
            getFiles={judgeApi.getCommitAnalysis}
          />
        ),
      }]
    : [
      {
        key: 'plagiarism',
        label: <span><FileSearchOutlined /> 查重分析</span>,
        children: (
          <MarkdownViewer
            projectId={project.id}
            getFiles={judgeApi.getPlagiarismFiles}
          />
        ),
      },
      {
        key: 'commit',
        label: <span><CodeOutlined /> 代码提交分析</span>,
        children: (
          <MarkdownViewer
            projectId={project.id}
            getFiles={judgeApi.getCommitAnalysis}
          />
        ),
      },
      {
        key: 'rank',
        label: <span><OrderedListOutlined /> 排行榜</span>,
        children: null,
      },
    ];

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 20, padding: '4px 8px', fontSize: 14, color: '#666' }}
      >
        返回
      </Button>

      <Card
        title={
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            <InfoCircleOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            作品信息
          </span>
        }
        style={{ borderRadius: 12, marginBottom: 24 }}
        styles={{ body: { padding: '20px 24px' } }}
      >
        <div style={{
          marginBottom: 20,
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #f6f8fc 0%, #eef1f7 100%)',
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              <TrophyOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
              {project.teamName}
            </Title>
            <Tag
              color={project.type === '内核赛' ? 'purple' : 'cyan'}
              style={{ borderRadius: 6, fontSize: 13, padding: '2px 12px' }}
            >
              {project.type || '功能赛'}
            </Tag>
            <Tag color="blue" style={{ borderRadius: 6 }}>{project.round}</Tag>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Text type="secondary">
              <HomeOutlined style={{ marginRight: 4 }} />
              {project.school}
            </Text>
            <Text type="secondary">
              <TeamOutlined style={{ marginRight: 4 }} />
              队长: {project.leaderName}
            </Text>
          </div>
        </div>

        <Descriptions column={2} size="middle" labelStyle={{ color: '#666' }}>
          <Descriptions.Item label="作品编号">
            <Text code style={{ fontSize: 13 }}>{project.projectCode}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="赛段">{project.round}</Descriptions.Item>
          <Descriptions.Item label="仓库地址">
            {project.repoUrl ? (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13 }}
              >
                <LinkOutlined /> 查看仓库
              </a>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备注">{project.remark || '无'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            <FileSearchOutlined style={{ marginRight: 8, color: '#722ed1' }} />
            作品材料
          </span>
        }
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: '12px 24px' } }}
      >
        <Tabs
          defaultActiveKey={isFeature ? 'commit' : 'plagiarism'}
          items={tabItems}
          size="large"
          tabBarStyle={{ marginBottom: 8 }}
          onTabClick={(key) => {
            if (key === 'rank') {
              window.open(rankUrl, '_blank', 'noopener,noreferrer');
            }
          }}
        />
      </Card>
    </div>
  );
}
