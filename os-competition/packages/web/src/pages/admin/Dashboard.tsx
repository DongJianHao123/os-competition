import { Card, Col, Row, Statistic } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';

export default function Dashboard() {
  const { data: summary } = useQuery({
    queryKey: ['review-summary'],
    queryFn: () => adminApi.getReviewSummary().then((r) => r.data),
  });

  const totalReviews = (summary?.matrix || []).reduce(
    (acc: number, row: any) => acc + (Object.keys(row).filter((k) => k.startsWith('judge_') && row[k] !== null).length),
    0,
  );
  const totalPossible = (summary?.judges?.length || 0) * (summary?.projects?.length || 0);

  return (
    <div>
      <h2>仪表盘</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="参赛作品" value={summary?.projects?.length || 0} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="评委人数" value={summary?.judges?.length || 0} /></Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进度"
              value={totalReviews}
              suffix={`/ ${totalPossible}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="完成率"
              value={totalPossible > 0 ? Math.round((totalReviews / totalPossible) * 100) : 0}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
