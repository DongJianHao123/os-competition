import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const { user } = await login(values.phone, values.password);
      // 通过隐藏的 iframe + 原生 form 触发浏览器保存密码
      triggerPasswordSave(values.phone, values.password);
      message.success('登录成功');
      navigate(user.role === 'admin' ? '/admin/projects-manage' : '/judge/groups', { replace: true });
    } catch {
      message.error('登录失败，请检查手机号或密码');
    } finally {
      setLoading(false);
    }
  };

  const triggerPasswordSave = (username: string, password: string) => {
    // 创建隐藏 iframe
    const iframe = document.createElement('iframe');
    iframe.name = 'credential-save';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // 创建原生 form，提交到隐藏 iframe 中，浏览器检测到原生表单提交
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/login';
    form.target = 'credential-save';
    form.style.display = 'none';

    const userInput = document.createElement('input');
    userInput.type = 'text';
    userInput.name = 'phone';
    userInput.autocomplete = 'username';
    userInput.value = username;
    form.appendChild(userInput);

    const passInput = document.createElement('input');
    passInput.type = 'password';
    passInput.name = 'password';
    passInput.autocomplete = 'current-password';
    passInput.value = password;
    form.appendChild(passInput);

    document.body.appendChild(form);
    form.submit();

    // 清理 DOM
    setTimeout(() => {
      document.body.removeChild(form);
      document.body.removeChild(iframe);
    }, 2000);
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: '#f0f2f5',
    }}>
      <Card style={{ width: 400 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          OS大赛数据
        </Typography.Title>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input prefix={<UserOutlined />} placeholder="手机号" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
