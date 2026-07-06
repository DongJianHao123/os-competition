import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Input, Tag, Button, Modal, Typography } from 'antd';
import { SearchOutlined, FileSearchOutlined, HistoryOutlined, FullscreenOutlined, FullscreenExitOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';
import MarkdownViewer from '../../components/MarkdownViewer';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['judge-group-projects', id, page],
    queryFn: () => judgeApi.getGroupProjects(Number(id), page, 10).then((r) => r.data),
  });

  // 查重弹窗
  const [plagProject, setPlagProject] = useState<any>(null);
  const [plagModalOpen, setPlagModalOpen] = useState(false);
  const [plagFullscreen, setPlagFullscreen] = useState(false);
  const [plagKey, setPlagKey] = useState(0);

  // 提交记录弹窗
  const [commitProject, setCommitProject] = useState<any>(null);
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitFullscreen, setCommitFullscreen] = useState(false);
  const [commitKey, setCommitKey] = useState(0);

  const { data: myReviews } = useQuery({
    queryKey: ['my-reviews-list'],
    queryFn: () => judgeApi.getMyReviews(1, 999).then((r) => r.data),
  });

  const reviewedIds = new Set(
    (myReviews?.data || []).map((r: any) => r.project?.id || r.projectId),
  );

  const group = data?.group;

  const columns = [
    { title: '作品编号', dataIndex: 'projectCode', key: 'projectCode', width: 170 },
    { title: '团队名称', dataIndex: 'teamName', key: 'teamName' },
    { title: '队长', dataIndex: 'leaderName', key: 'leaderName' },
    { title: '学校', dataIndex: 'school', key: 'school' },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 90,
      render: (v: string) => (
        <Tag color={v === '内核赛' ? 'purple' : 'cyan'}>{v || '功能赛'}</Tag>
      ),
    },
    {
      title: '评审状态', key: 'reviewStatus',
      render: (_: any, record: any) =>
        reviewedIds.has(record.id) ? <Tag color="green">已评审</Tag> : <Tag>待评审</Tag>,
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => (
        <>
          <Button
            type="link"
            icon={<FileSearchOutlined />}
            onClick={() => {
              setPlagProject(record);
              setPlagModalOpen(true);
              setPlagKey(k => k + 1);
            }}
          >
            查重
          </Button>
          <Button
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => {
              setCommitProject(record);
              setCommitModalOpen(true);
              setCommitKey(k => k + 1);
            }}
          >
            提交记录
          </Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/judge/groups')}>
          返回分组
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {group?.name || '分组详情'}
        </Typography.Title>
        {group && (
          <Tag color={group.type === '内核赛' ? 'purple' : 'cyan'}>{group.type}</Tag>
        )}
      </div>
      <Input.Search
        placeholder="搜索团队、队长、学校、编号"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onSearch={() => setPage(1)}
        style={{ width: 300, marginBottom: 16 }}
        enterButton={<SearchOutlined />}
      />
      <Table
        columns={columns} dataSource={data?.data || []} rowKey="id" loading={isLoading}
        pagination={{ current: page, total: data?.total || 0, onChange: setPage }}
        onRow={(record) => ({
          onClick: () => navigate(`/judge/projects/${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />

      {/* 查重弹窗（只读） */}
      <Modal
        title={plagProject ? `查重结果 — ${plagProject.teamName}` : '查重结果'}
        open={plagModalOpen}
        onCancel={() => { setPlagModalOpen(false); setPlagFullscreen(false); }}
        width={plagFullscreen ? '100%' : 1000}
        footer={null}
        destroyOnClose
        style={plagFullscreen ? { maxWidth: '100vw', top: 0, paddingBottom: 0 } : { top: 30 }}
        styles={{ body: plagFullscreen ? { height: 'calc(100vh - 55px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {} }}
      >
        {plagProject && (
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Button
              type="text"
              icon={plagFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={() => setPlagFullscreen(!plagFullscreen)}
              style={{ marginLeft: 'auto' }}
            />
          </div>
        )}
        {plagProject && (
          <MarkdownViewer
            key={plagKey}
            projectId={plagProject.id}
            getFiles={judgeApi.getPlagiarismFiles}
          />
        )}
      </Modal>

      {/* 提交记录弹窗（只读） */}
      <Modal
        title={commitProject ? `提交记录分析 — ${commitProject.teamName}` : '提交记录分析'}
        open={commitModalOpen}
        onCancel={() => { setCommitModalOpen(false); setCommitFullscreen(false); }}
        width={commitFullscreen ? '100%' : 1000}
        footer={null}
        destroyOnClose
        style={commitFullscreen ? { maxWidth: '100vw', top: 0, paddingBottom: 0 } : { top: 30 }}
        styles={{ body: commitFullscreen ? { height: 'calc(100vh - 55px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {} }}
      >
        {commitProject && (
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Button
              type="text"
              icon={commitFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={() => setCommitFullscreen(!commitFullscreen)}
              style={{ marginLeft: 'auto' }}
            />
          </div>
        )}
        {commitProject && (
          <MarkdownViewer
            key={commitKey}
            projectId={commitProject.id}
            getFiles={judgeApi.getCommitAnalysis}
          />
        )}
      </Modal>
    </div>
  );
}
