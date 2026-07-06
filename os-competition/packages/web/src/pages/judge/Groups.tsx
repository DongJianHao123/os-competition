import { Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';

export default function Groups() {
  const navigate = useNavigate();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['judge-groups'],
    queryFn: () => judgeApi.getMyGroups().then((r) => r.data),
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
  ];

  return (
    <div>
      <h2>评审分组</h2>
      <Table
        columns={columns}
        dataSource={groups || []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        onRow={(record) => ({
          onClick: () => navigate(`/judge/groups/${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );
}
