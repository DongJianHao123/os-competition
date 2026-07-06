import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Descriptions, Card, Form, Radio, Input, Button, message, Spin, Row, Col } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { judgeApi } from '../../api/judge';

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['project-detail', id],
    queryFn: () => judgeApi.getProject(Number(id)).then((r) => r.data),
  });

  const { data: readmeData } = useQuery({
    queryKey: ['project-readme', id],
    queryFn: () =>
      judgeApi
        .getReadme(Number(id))
        .then((r) => r.data)
        .catch(() => null),
  });

  const submitMut = useMutation({
    mutationFn: (values: any) => judgeApi.submitReview(Number(id), values),
    onSuccess: () => message.success('评审提交成功'),
    onError: () => message.error('提交失败'),
  });

  useEffect(() => {
    if (data?.review) {
      form.setFieldsValue(data.review);
    }
  }, [data, form]);

  if (isLoading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const project = data?.project;
  if (!project) return <div>作品不存在</div>;

  return (
    <Row gutter={24}>
      <Col span={14}>
        <Card title="作品信息">
          <Descriptions column={1}>
            <Descriptions.Item label="作品编号">{project.projectCode}</Descriptions.Item>
            <Descriptions.Item label="团队名称">{project.teamName}</Descriptions.Item>
            <Descriptions.Item label="队长">{project.leaderName}</Descriptions.Item>
            <Descriptions.Item label="学校">{project.school}</Descriptions.Item>
            <Descriptions.Item label="仓库地址">
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                {project.repoUrl}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="赛段">{project.round}</Descriptions.Item>
            <Descriptions.Item label="备注">{project.remark || '无'}</Descriptions.Item>
          </Descriptions>
        </Card>
        {readmeData && (
          <Card title="README 预览" style={{ marginTop: 16 }}>
            <pre style={{
              whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto',
              background: '#f6f8fa', padding: 16, borderRadius: 4,
            }}>
              {readmeData.content}
            </pre>
          </Card>
        )}
      </Col>
      <Col span={10}>
        <Card title="评审打分">
          <Form form={form} layout="vertical" onFinish={(values) => submitMut.mutate(values)}>
            <Form.Item name="docScore" label="文档评审" rules={[{ required: true, message: '请选择' }]}>
              <Radio.Group>
                <Radio.Button value="优">优</Radio.Button>
                <Radio.Button value="良">良</Radio.Button>
                <Radio.Button value="中">中</Radio.Button>
                <Radio.Button value="差">差</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="codeScore" label="代码评审" rules={[{ required: true, message: '请选择' }]}>
              <Radio.Group>
                <Radio.Button value="优">优</Radio.Button>
                <Radio.Button value="良">良</Radio.Button>
                <Radio.Button value="中">中</Radio.Button>
                <Radio.Button value="差">差</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="finalDecision" label="是否进入决赛" rules={[{ required: true, message: '请选择' }]}>
              <Radio.Group>
                <Radio.Button value="是">是</Radio.Button>
                <Radio.Button value="否">否</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="comment" label="评语">
              <Input.TextArea rows={4} placeholder="可填写补充评语..." />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitMut.isPending} block>
                提交评审
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
