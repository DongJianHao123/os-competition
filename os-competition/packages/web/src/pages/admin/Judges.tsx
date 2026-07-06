import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Tag, message, Space, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

export default function Judges() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['judges', page],
    queryFn: () => adminApi.listJudges(page, 10).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (values: any) => adminApi.createJudge(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judges'] });
      setModalOpen(false);
      message.success('创建成功');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.updateJudge(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judges'] });
      message.success('更新成功');
    },
  });

  const resetPwdMut = useMutation({
    mutationFn: (id: number) => adminApi.resetPassword(id, '123456'),
    onSuccess: () => message.success('密码已重置为 123456'),
  });

  const columns = [
    {
      title: '序号', key: 'index', width: 60,
      render: (_: any, __: any, index: number) => (page - 1) * 10 + index + 1,
    },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    {
      title: '评委类型', dataIndex: 'judgeType', key: 'judgeType', width: 100,
      render: (v: string) => (
        <Tag color={v === '内核赛' ? 'purple' : 'cyan'}>{v || '-'}</Tag>
      ),
    },
    {
      title: '状态', dataIndex: 'isActive', key: 'isActive',
      render: (v: boolean, record: any) => (
        <Switch checked={v} onChange={(checked) => updateMut.mutate({ id: record.id, data: { isActive: checked } })} />
      ),
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => { setEditingJudge(record); form.setFieldsValue(record); setModalOpen(true); }}>
            编辑
          </Button>
          <Popconfirm title="重置密码为 123456？" onConfirm={() => resetPwdMut.mutate(record.id)}>
            <Button size="small">重置密码</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingJudge) {
        updateMut.mutate(
          { id: editingJudge.id, data: { name: values.name, phone: values.phone, judgeType: values.judgeType } },
          { onSuccess: () => setModalOpen(false) },
        );
      } else {
        createMut.mutate(values);
      }
    });
  };

  return (
    <div>
      <Button
        type="primary" icon={<PlusOutlined />}
        onClick={() => { setEditingJudge(null); form.resetFields(); setModalOpen(true); }}
        style={{ marginBottom: 16 }}
      >
        新增评委
      </Button>
      <Table
        columns={columns} dataSource={data?.data || []} rowKey="id" loading={isLoading}
        pagination={{ current: page, total: data?.total || 0, onChange: setPage }}
      />
      <Modal
        title={editingJudge ? '编辑评委' : '新增评委'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="judgeType" label="评委类型" rules={[{ required: true, message: '请选择评委类型' }]}>
            <Select placeholder="请选择">
              <Select.Option value="内核赛">内核赛</Select.Option>
              <Select.Option value="功能赛">功能赛</Select.Option>
            </Select>
          </Form.Item>
          {!editingJudge && (
            <Form.Item name="password" label="密码" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
