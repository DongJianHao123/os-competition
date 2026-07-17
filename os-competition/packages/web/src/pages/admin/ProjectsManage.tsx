import { useState, useRef } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Tag,
  Popconfirm as Pop,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, FileSearchOutlined,
  UploadOutlined, ClearOutlined, HistoryOutlined,
  FullscreenOutlined, FullscreenExitOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import MarkdownViewer from '../../components/MarkdownViewer';
import { fileUpload } from '../../utils/oss';

export default function ProjectsManage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [form] = Form.useForm();

  // 查重弹窗
  const [plagProject, setPlagProject] = useState<any>(null);
  const [plagModalOpen, setPlagModalOpen] = useState(false);
  const [plagFullscreen, setPlagFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [plagKey, setPlagKey] = useState(0);
  const folderRef = useRef<HTMLInputElement>(null);

  // 提交记录分析弹窗
  const [commitProject, setCommitProject] = useState<any>(null);
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitFullscreen, setCommitFullscreen] = useState(false);
  const [commitUploading, setCommitUploading] = useState(false);
  const [commitKey, setCommitKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-projects', page, search, type, status],
    queryFn: () => adminApi.listProjects(page, 10, search || undefined, type, status).then((r) => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      setModalOpen(false);
      message.success('更新成功');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      message.success('删除成功');
    },
  });

  const handlePlagSelect = () => {
    const input = folderRef.current;
    if (!input) return;
    input.onchange = () => {
      const mdFiles = Array.from(input.files || []).filter(f => f.name.endsWith('.md'));
      if (mdFiles.length === 0) {
        message.warning('所选文件夹中没有 .md 文件');
        input.value = '';
        return;
      }
      const totalSize = mdFiles.reduce((sum, f) => sum + f.size, 0);
      const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
      Modal.confirm({
        title: '确认上传查重结果',
        content: `共 ${mdFiles.length} 个 .md 文件，总大小 ${sizeMB} MB，确定上传？`,
        onOk: async () => {
          setUploading(true);
          try {
            const uploaded: { filename: string; url: string }[] = [];
            for (const file of mdFiles) {
              const url = await fileUpload(file);
              uploaded.push({ filename: file.name, url });
            }
            const res = await adminApi.uploadPlagiarism(plagProject!.id, uploaded);
            message.success(`已上传 ${res.data.count} 个文件`);
            setPlagKey(k => k + 1);
          } catch {
            message.error('上传失败');
          } finally {
            setUploading(false);
            input.value = '';
          }
        },
        onCancel: () => { input.value = ''; },
      });
    };
    input.click();
  };

  const handleClear = async (projectId: number) => {
    await adminApi.deletePlagiarism(projectId);
    message.success('已清除查重结果');
    setPlagKey(k => k + 1);
  };

  const handleCommitSelect = () => {
    const input = fileRef.current;
    if (!input) return;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.name.endsWith('.md')) {
        message.warning('请选择 .md 文件');
        input.value = '';
        return;
      }
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      Modal.confirm({
        title: '确认上传提交记录',
        content: `文件：${file.name}，大小 ${sizeMB} MB，确定上传？`,
        onOk: async () => {
          setCommitUploading(true);
          try {
            const url = await fileUpload(file);
            await adminApi.uploadCommitAnalysis(commitProject!.id, { filename: file.name, url });
            message.success('上传成功');
            setCommitKey(k => k + 1);
          } catch {
            message.error('上传失败');
          } finally {
            setCommitUploading(false);
            input.value = '';
          }
        },
        onCancel: () => { input.value = ''; },
      });
    };
    input.click();
  };

  const handleCommitClear = async (projectId: number) => {
    await adminApi.deleteCommitAnalysis(projectId);
    message.success('已清除提交记录分析');
    setCommitKey(k => k + 1);
  };

  const columns = [
    {
      title: '序号', key: 'index', width: 60,
      render: (_: any, __: any, index: number) => (page - 1) * 10 + index + 1,
    },
    { title: '作品编号', dataIndex: 'projectCode', key: 'projectCode', width: 170 },
    { title: '团队名称', dataIndex: 'teamName', key: 'teamName', width: 180 },
    { title: '队长', dataIndex: 'leaderName', key: 'leaderName', width: 100 },
    { title: '学校', dataIndex: 'school', key: 'school', width: 180 },
    {
      title: '仓库地址', dataIndex: 'repoUrl', key: 'repoUrl', width: 100,
      render: (v: string) => v ? <a href={v} target="_blank" rel="noopener noreferrer">链接</a> : '-',
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 90,
      render: (v: string) => (
        <Tag color={v === '内核赛' ? 'purple' : 'cyan'}>{v || '功能赛'}</Tag>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => <Tag color={v === '待完成' ? 'blue' : 'green'}>{v}</Tag>,
    },
    {
      title: '操作', key: 'actions', width: 320,
      render: (_: any, record: any) => (
        <Space wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditingProject(record);
            form.setFieldsValue(record);
            setModalOpen(true);
          }}>编辑</Button>
          <Button size="small" icon={<FileSearchOutlined />} onClick={() => {
            setPlagProject(record);
            setPlagModalOpen(true);
          }}>查重分析</Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => {
            setCommitProject(record);
            setCommitModalOpen(true);
            setCommitKey(k => k + 1);
          }}>代码提交分析</Button>
          <Popconfirm title="确定删除？将同时删除关联数据" onConfirm={() => deleteMut.mutate(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingProject) {
        updateMut.mutate({ id: editingProject.id, data: values });
      }
    });
  };

  return (
    <div>
      <h2>作品管理</h2>
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
        <Input.Search
          placeholder="搜索编号、团队、队长、学校"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => setPage(1)}
          style={{ width: 320 }}
          allowClear
        />
        <Select
          placeholder="作品类型"
          value={type}
          onChange={(v) => { setType(v); setPage(1); }}
          allowClear
          style={{ width: 130 }}
        >
          <Select.Option value="内核赛">内核赛</Select.Option>
          <Select.Option value="功能赛">功能赛</Select.Option>
        </Select>
        <Select
          placeholder="作品状态"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          allowClear
          style={{ width: 130 }}
        >
          <Select.Option value="待完成">待完成</Select.Option>
          <Select.Option value="已完成">已完成</Select.Option>
        </Select>
        <span style={{ lineHeight: '32px', color: '#999' }}>
          共 {data?.total || 0} 条记录
        </span>
      </div>
      <Table
        columns={columns}
        dataSource={data?.data || []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1200 }}
        pagination={{ current: page, total: data?.total || 0, onChange: setPage }}
      />

      {/* 编辑弹窗 */}
      <Modal
        title="编辑作品"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="teamName" label="团队名称"><Input /></Form.Item>
          <Form.Item name="leaderName" label="队长"><Input /></Form.Item>
          <Form.Item name="school" label="学校"><Input /></Form.Item>
          <Form.Item name="repoUrl" label="仓库地址"><Input /></Form.Item>
          <Form.Item name="round" label="赛段"><Input /></Form.Item>
          <Form.Item name="type" label="类型">
            <Select>
              <Select.Option value="内核赛">内核赛</Select.Option>
              <Select.Option value="功能赛">功能赛</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态"><Input /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* 查重弹窗 */}
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
            <input
              ref={folderRef}
              type="file"
              // @ts-ignore webkitdirectory is not in React types
              webkitdirectory=""
              directory=""
              style={{ display: 'none' }}
              accept=".md"
            />
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
              onClick={handlePlagSelect}
            >
              上传查重结果
            </Button>
            <Pop
              title="确定清除所有查重结果？"
              onConfirm={() => handleClear(plagProject.id)}
            >
              <Button icon={<ClearOutlined />} danger>清除</Button>
            </Pop>
            <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>
              请选择包含 .md 文件的文件夹
            </span>
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
            getFiles={adminApi.getPlagiarismFiles}
          />
        )}
      </Modal>

      {/* 提交记录分析弹窗 */}
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
            <input
              ref={fileRef}
              type="file"
              style={{ display: 'none' }}
              accept=".md"
            />
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={commitUploading}
              onClick={handleCommitSelect}
            >
              上传提交记录
            </Button>
            <Pop
              title="确定清除提交记录分析？"
              onConfirm={() => handleCommitClear(commitProject.id)}
            >
              <Button icon={<ClearOutlined />} danger>清除</Button>
            </Pop>
            <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>
              请选择 .md 文件
            </span>
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
            getFiles={adminApi.getCommitAnalysis}
          />
        )}
      </Modal>
    </div>
  );
}
