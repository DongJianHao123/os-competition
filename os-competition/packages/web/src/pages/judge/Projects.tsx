import { useState } from 'react';
import { Table, Input, Tag, Button, Modal } from 'antd';
import { SearchOutlined, FileSearchOutlined, HistoryOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';
import MarkdownViewer from '../../components/MarkdownViewer';

export default function Projects() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

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

  const { data, isLoading } = useQuery({
    queryKey: ['judge-projects', page, search],
    queryFn: () => judgeApi.listProjects(page, 10, search).then((r) => r.data),
  });

  const { data: myReviews } = useQuery({
    queryKey: ['my-reviews-list'],
    queryFn: () => judgeApi.getMyReviews(1, 999).then((r) => r.data),
  });

  const reviewedIds = new Set(
    (myReviews?.data || []).map((r: any) => r.project?.id || r.projectId),
  );

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
      title: '状态', key: 'reviewStatus',
      render: (_: any, record: any) =>
        reviewedIds.has(record.id) ? <Tag color="green">已完成</Tag> : <Tag>待完成</Tag>,
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
            查重分析
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
            代码提交分析
          </Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <h2>作品列表</h2>
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
