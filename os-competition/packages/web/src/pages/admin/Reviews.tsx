import { Table, Tag, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

const scoreColorMap: Record<string, string> = { '优': 'green', '良': 'blue', '中': 'orange', '差': 'red' };
const decisionColorMap: Record<string, string> = { '是': 'green', '否': 'red' };

export default function Reviews() {
  const { data, isLoading } = useQuery({
    queryKey: ['review-summary'],
    queryFn: () => adminApi.getReviewSummary().then((r) => r.data),
  });

  const handleExport = async () => {
    const res = await adminApi.exportReviews();
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = '评审结果.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  const judges = (data?.judges || []) as any[];
  const matrix = (data?.matrix || []) as any[];

  const columns: any[] = [
    { title: '作品编号', dataIndex: 'projectCode', key: 'projectCode', fixed: 'left', width: 160 },
    { title: '团队', dataIndex: 'teamName', key: 'teamName', fixed: 'left', width: 150 },
    ...judges.map((j: any) => ({
      title: j.name,
      key: `judge_${j.id}`,
      render: (_: any, record: any) => {
        const r = record[`judge_${j.id}`];
        if (!r) return <Tag>未评</Tag>;
        return (
          <div>
            {r.docScore && <Tag color={scoreColorMap[r.docScore]}>文档:{r.docScore}</Tag>}
            {r.codeScore && <Tag color={scoreColorMap[r.codeScore]}>代码:{r.codeScore}</Tag>}
            {r.finalDecision && (
              <Tag color={decisionColorMap[r.finalDecision]}>
                {r.finalDecision === '是' ? '进入决赛' : '不进入'}
              </Tag>
            )}
          </div>
        );
      },
    })),
  ];

  return (
    <div>
      <Button icon={<DownloadOutlined />} onClick={handleExport} type="primary" style={{ marginBottom: 16 }}>
        导出评审 Excel
      </Button>
      <Table
        columns={columns} dataSource={matrix} rowKey="projectCode" loading={isLoading}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
