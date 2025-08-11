import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Badge,
  Modal,
  Form,
  Input,
  Button,
  message,
  theme
} from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  LockOutlined,
  BellOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ShopOutlined,
  BarChartOutlined,
  SettingOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { logout, changePassword } from '@/api/auth';
import './index.scss';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 获取当前用户信息
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 菜单配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/cashier',
      icon: <ShoppingCartOutlined />,
      label: '收银台',
    },
    {
      key: '/members',
      icon: <TeamOutlined />,
      label: '会员管理',
      children: [
        {
          key: '/members/list',
          label: '会员列表',
        },
        {
          key: '/members/points',
          label: '积分管理',
        },
      ],
    },
    {
      key: '/products',
      icon: <ShopOutlined />,
      label: '商品管理',
      children: [
        {
          key: '/products/list',
          label: '商品列表',
        },
        {
          key: '/products/categories',
          label: '商品分类',
        },
        {
          key: '/products/inventory',
          label: '库存管理',
        },
      ],
    },
    {
      key: '/recipes',
      icon: <ExperimentOutlined />,
      label: '配方管理',
      children: [
        {
          key: '/recipes/materials',
          label: '原材料管理',
        },
        {
          key: '/recipes/list',
          label: '配方列表',
        },
        {
          key: '/recipes/service',
          label: '磨粉服务',
        },
      ],
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: '报表中心',
      children: [
        {
          key: '/reports/sales',
          label: '营收报表',
        },
        {
          key: '/reports/products',
          label: '商品分析',
        },
        {
          key: '/reports/members',
          label: '会员分析',
        },
      ],
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        {
          key: '/settings/users',
          label: '用户管理',
          // 只有管理员可见
          visible: user.role === 'admin',
        },
        {
          key: '/settings/shop',
          label: '店铺设置',
        },
        {
          key: '/settings/system',
          label: '系统配置',
        },
      ].filter(item => item.visible !== false),
    },
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  // 处理退出登录
  const handleLogout = async () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await logout();
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          message.success('已安全退出');
          navigate('/login');
        } catch (error) {
          // 即使接口调用失败也清除本地数据
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      },
    });
  };

  // 处理修改密码
  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      await changePassword(values);
      message.success('密码修改成功，请重新登录');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
      // 清除登录信息，跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      // 错误已在请求拦截器中处理
    } finally {
      setLoading(false);
    }
  };

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'password',
      icon: <LockOutlined />,
      label: '修改密码',
      onClick: () => setPasswordModalVisible(true),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="main-layout">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="layout-sider"
      >
        <div className="logo">
          <h1>{collapsed ? 'DM' : '神龙磨坊'}</h1>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['/products', '/members', '/settings']}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      
      <Layout>
        <Header
          style={{
            padding: 0,
            background: colorBgContainer,
          }}
          className="layout-header"
        >
          <div className="header-content">
            <div className="header-left">
              {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                className: 'trigger',
                onClick: () => setCollapsed(!collapsed),
              })}
            </div>
            
            <div className="header-right">
              <Space size={24}>
                {/* 通知图标 */}
                <Badge count={5} size="small">
                  <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
                </Badge>
                
                {/* 用户信息 */}
                <Dropdown
                  menu={{ items: userMenuItems }}
                  placement="bottomRight"
                >
                  <Space className="user-info" style={{ cursor: 'pointer' }}>
                    <Avatar icon={<UserOutlined />} />
                    <span>{user.name}</span>
                  </Space>
                </Dropdown>
              </Space>
            </div>
          </div>
        </Header>
        
        <Content
          className="layout-content"
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="oldPassword"
            label="原密码"
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password placeholder="请输入原密码" />
          </Form.Item>
          
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setPasswordModalVisible(false);
                passwordForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                确定
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default MainLayout;