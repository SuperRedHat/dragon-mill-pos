import React from 'react';
import { Form, Input, Button, Card, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '@/api/auth';
import './index.scss';

const Login = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const { message } = App.useApp();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await login(values);
      if (res.success) {
        // 保存 token 和用户信息
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        message.success('登录成功');
        navigate('/dashboard');
      }
    } catch (error) {
      // 错误已在拦截器中处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <h1>神龙磨坊</h1>
          <p>收银管理系统</p>
        </div>
        
        <Form
          form={form}
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        {import.meta.env.VITE_DEMO_ADMIN_PASSWORD && (
          <div className="login-footer">
            <p>演示账号：admin / {import.meta.env.VITE_DEMO_ADMIN_PASSWORD}</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Login;