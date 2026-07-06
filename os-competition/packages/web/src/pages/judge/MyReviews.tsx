import { useState } from 'react';
import { Table, Tag, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';

const scoreColorMap: Record<string, string> = { '优': 'green', '良': 'blue', '中': 'orange', '差': 'red' };

export default function MyReviews() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['my-reviews', page],
    queryFn: () => judgeApi.getMyReviews(page, 10).then((r) => r.data),
  });

  const columns = [
    { title: '作品编号', dataIndex: ['project', 'projectCode'], key: 'projectCode' },
    { title: '团队', dataIndex: ['project', 'teamName'], key: 'teamName' },
    {
      title: '文档评审', dataIndex: 'docScore', key: 'docScore',
      render: (v: string) => (v ? <Tag color={scoreColorMap[v]}>{v}</Tag> : '-'),
    },
    {
      title: '代码评审', dataIndex: 'codeScore', key: 'codeScore',
      render: (v: string) => (v ? <Tag color={scoreColorMap[v]}>{v}</Tag> : '-'),
    },
    {
      title: '决赛意见', dataIndex: 'finalDecision', key: 'finalDecision',
      render: (v: string) =>
        v ? <Tag color={v === '是' ? 'green' : 'red'}>{v === '是' ? '进入' : '不进入'}</Tag> : '-',
    },
    {
      title: '评审时间', dataIndex: 'reviewedAt', key: 'reviewedAt',
      render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => (
        <Button type="link" onClick={() => navigate(`/judge/projects/${record.project?.id || record.projectId}`)}>
          修改
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h2>我的评审历史</h2>
      <Table
        columns={columns} dataSource={data?.data || []} rowKey="id" loading={isLoading}
        pagination={{ current: page, total: data?.total || 0, onChange: setPage }}
      />
    </div>
  );
}
