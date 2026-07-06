import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, Space, Popconfirm, Transfer } from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

export default function GroupManage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 成员管理
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberGroupId, setMemberGroupId] = useState<number | null>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => adminApi.listGroups().then((r) => r.data),
  });

  const { data: judges } = useQuery({
    queryKey: ['admin-judges-all'],
    queryFn: () => adminApi.listJudges(1, 999).then((r) => r.data),
  });

  const { data: projects } = useQuery({
    queryKey: ['admin-projects-all'],
    queryFn: () => adminApi.listProjects(1, 999).then((r) => r.data),
  });

  const { data: groupDetail } = useQuery({
    queryKey: ['admin-group-detail', memberGroupId],
    queryFn: () => adminApi.getGroup(memberGroupId!).then((r) => r.data),
    enabled: !!memberGroupId,
  });

  const createMut = useMutation({
    mutationFn: (values: any) => adminApi.createGroup(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      setModalOpen(false);
      message.success('创建成功');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      setModalOpen(false);
      message.success('更新成功');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      message.success('删除成功');
    },
  });

  const addJudgesMut = useMutation({
    mutationFn: ({ groupId, judgeIds }: { groupId: number; judgeIds: number[] }) =>
      adminApi.addGroupJudges(groupId, judgeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-detail', memberGroupId] });
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      message.success('评委已添加');
    },
  });

  const removeJudgeMut = useMutation({
    mutationFn: ({ groupId, judgeId }: { groupId: number; judgeId: number }) =>
      adminApi.removeGroupJudge(groupId, judgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-detail', memberGroupId] });
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      message.success('评委已移除');
    },
  });

  const addProjectsMut = useMutation({
    mutationFn: ({ groupId, projectIds }: { groupId: number; projectIds: number[] }) =>
      adminApi.addGroupProjects(groupId, projectIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-detail', memberGroupId] });
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      message.success('作品已添加');
    },
  });

  const removeProjectMut = useMutation({
    mutationFn: ({ groupId, projectId }: { groupId: number; projectId: number }) =>
      adminApi.removeGroupProject(groupId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-group-detail', memberGroupId] });
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      message.success('作品已移除');
    },
  });

  const columns = [
    { title: '分组名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 100,
      render: (v: string) => (
        <Tag color={v === '内核赛' ? 'purple' : 'cyan'}>{v}</Tag>
      ),
    },
    {
      title: '评委会', dataIndex: '_count', key: 'judges', width: 80,
      render: (v: any) => v?.judges || 0,
    },
    {
      title: '作品数', dataIndex: '_count', key: 'projects', width: 80,
      render: (v: any) => v?.projects || 0,
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditingGroup(record);
              form.setFieldsValue(record);
              setModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={() => {
              setMemberGroupId(record.id);
              setMemberModalOpen(true);
            }}
          >
            成员
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => deleteMut.mutate(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingGroup) {
        updateMut.mutate({ id: editingGroup.id, data: values });
      } else {
        createMut.mutate(values);
      }
    });
  };

  // Transfer data
  const currentJudgeIds = new Set((groupDetail?.judges || []).map((j: any) => j.judge?.id || j.judgeId));
  const currentProjectIds = new Set((groupDetail?.projects || []).map((p: any) => p.id));

  const judgeTransferData = (judges?.data || []).map((j: any) => ({
    key: j.id,
    title: `${j.name} (${j.judgeType || '-'})`,
  }));

  const projectTransferData = (projects?.data || [])
    .filter((p: any) => !p.groupId || p.groupId === memberGroupId)
    .map((p: any) => ({
      key: p.id,
      title: `${p.projectCode} - ${p.teamName}`,
    }));

  return (
    <div>
      <Button
        type="primary" icon={<PlusOutlined />}
        onClick={() => { setEditingGroup(null); form.resetFields(); setModalOpen(true); }}
        style={{ marginBottom: 16 }}
      >
        新增分组
      </Button>
      <Table
        columns={columns} dataSource={groups || []} rowKey="id" loading={isLoading}
        pagination={false}
      />

      <Modal
        title={editingGroup ? '编辑分组' : '新增分组'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分组名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select placeholder="请选择">
              <Select.Option value="内核赛">内核赛</Select.Option>
              <Select.Option value="功能赛">功能赛</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 成员管理弹窗 */}
      <Modal
        title="成员管理"
        open={memberModalOpen}
        onCancel={() => { setMemberModalOpen(false); setMemberGroupId(null); }}
        footer={null}
        width={700}
        destroyOnClose
      >
        {groupDetail && (
          <div>
            <h4>评委</h4>
            <Transfer
              dataSource={judgeTransferData}
              targetKeys={[...currentJudgeIds]}
              titles={['可选评委', '已选评委']}
              render={(item) => item.title}
              showSearch
              filterOption={(inputValue, item) => item.title.toLowerCase().includes(inputValue.toLowerCase())}
              listStyle={{ width: 280, height: 280 }}
              onChange={(targetKeys) => {
                const added = targetKeys.filter((k: number) => !currentJudgeIds.has(k));
                const removed = [...currentJudgeIds].filter((k: number) => !targetKeys.includes(k));
                if (added.length) addJudgesMut.mutate({ groupId: memberGroupId!, judgeIds: added as number[] });
                if (removed.length) removeJudgeMut.mutate({ groupId: memberGroupId!, judgeId: removed[0] });
              }}
            />
            <h4 style={{ marginTop: 24 }}>作品</h4>
            <Transfer
              dataSource={projectTransferData}
              targetKeys={[...currentProjectIds]}
              titles={['可选作品', '已选作品']}
              render={(item) => item.title}
              showSearch
              filterOption={(inputValue, item) => item.title.toLowerCase().includes(inputValue.toLowerCase())}
              listStyle={{ width: 280, height: 280 }}
              onChange={(targetKeys) => {
                const added = targetKeys.filter((k: number) => !currentProjectIds.has(k));
                const removed = [...currentProjectIds].filter((k: number) => !targetKeys.includes(k));
                if (added.length) addProjectsMut.mutate({ groupId: memberGroupId!, projectIds: added as number[] });
                if (removed.length) removeProjectMut.mutate({ groupId: memberGroupId!, projectId: removed[0] });
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
