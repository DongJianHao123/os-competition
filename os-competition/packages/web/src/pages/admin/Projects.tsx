import { useState } from 'react';
import { Upload, Button, Table, Input, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

export default function Projects() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['import-logs', page, search],
    queryFn: () => adminApi.getImportLogs(page, 10, search || undefined).then((r) => r.data),
  });

  const handleUpload = async (file: File) => {
    try {
      const res = await adminApi.importProjects(file);
      message.success(`成功导入 ${res.data.count} 条作品数据`);
      window.location.reload();
    } catch {
      message.error('导入失败');
    }
    return false;
  };

  const columns = [
    { title: '文件名', dataIndex: 'filename', key: 'filename' },
    { title: '导入数量', dataIndex: 'count', key: 'count' },
    { title: '操作人', dataIndex: ['operator', 'name'], key: 'operator' },
    {
      title: '时间', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString(),
    },
  ];

  return (
    <div>
      <h2>作品导入</h2>
      <div style={{ marginBottom: 16 }}>
        <Upload
          beforeUpload={(file) => { handleUpload(file); return false; }}
          accept=".xlsx,.xls" showUploadList={false}
        >
          <Button icon={<UploadOutlined />} type="primary">上传 Excel 导入作品</Button>
        </Upload>
      </div>
      <h3>导入历史</h3>
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索文件名"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => setPage(1)}
          style={{ width: 320 }}
          allowClear
        />
      </div>
      <Table
        columns={columns} dataSource={logs?.data || []} rowKey="id" loading={isLoading}
        pagination={{ current: page, total: logs?.total || 0, onChange: setPage }}
      />
    </div>
  );
}
