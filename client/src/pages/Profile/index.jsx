import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Button,
  Avatar,
  Upload,
  App,
  Tabs,
  Tag,
  Timeline,
  Table,
  Empty,
  Modal,
  Space,
  Divider,
  Typography,
  Descriptions,
  Badge,
  Statistic
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  MailOutlined,
  EditOutlined,
  SaveOutlined,
  UploadOutlined,
  HistoryOutlined,
  SafetyOutlined,
  LoginOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getProfile, updateProfile, changePassword, getLoginHistory, getOperationLogs } from '@/api/profile';
import { getCurrentUser } from '@/api/auth';
import './index.scss';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [operationLogs, setOperationLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [stats, setStats] = useState({
    totalLogin: 0,
    totalOperations: 0,
    lastLogin: null,
    accountAge: 0
  });
  
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const { message } = App.useApp();

  // 获取用户信息
  const fetchUserInfo = async () => {
    setLoading(true);
    try {
      const res = await getCurrentUser();
      if (res.success) {
        setUserInfo(res.data);
        form.setFieldsValue({
          username: res.data.username,
          name: res.data.name,
          phone: res.data.phone,
          email: res.data.email
        });
        
        // 计算统计数据
        const accountAge = dayjs().diff(dayjs(res.data.createdAt), 'day');
        setStats(prev => ({
          ...prev,
          accountAge,
          lastLogin: res.data.lastLoginAt
        }));
      }
    } catch (error) {
      message.error('获取用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取登录历史（模拟数据）
  const fetchLoginHistory = async () => {
    // 由于后端暂未实现，这里使用模拟数据
    const mockData = [
      {
        id: 1,
        loginTime: '2024-01-20 09:30:00',
        ip: '192.168.1.100',
        device: 'Chrome 120.0 / Windows 10',
        location: '中国 北京',
        status: 'success'
      },
      {
        id: 2,
        loginTime: '2024-01-19 14:20:00',
        ip: '192.168.1.101',
        device: 'Chrome 120.0 / Windows 10',
        location: '中国 上海',
        status: 'success'
      },
      {
        id: 3,
        loginTime: '2024-01-18 10:15:00',
        ip: '192.168.1.102',
        device: 'Safari 17.0 / macOS',
        location: '中国 广州',
        status: 'failed'
      }
    ];
    setLoginHistory(mockData);
    setStats(prev => ({ ...prev, totalLogin: mockData.length }));
  };

  // 获取操作日志（模拟数据）
  const fetchOperationLogs = async () => {
    // 由于后端暂未实现完整功能，这里使用模拟数据
    const mockData = [
      {
        id: 1,
        module: '用户管理',
        action: '创建用户',
        content: '创建用户：test01',
        createdAt: '2024-01-20 10:30:00'
      },
      {
        id: 2,
        module: '商品管理',
        action: '编辑商品',
        content: '编辑商品：五谷杂粮粉',
        createdAt: '2024-01-20 09:45:00'
      },
      {
        id: 3,
        module: '会员管理',
        action: '新增会员',
        content: '新增会员：张三',
        createdAt: '2024-01-19 16:20:00'
      }
    ];
    setOperationLogs(mockData);
    setStats(prev => ({ ...prev, totalOperations: mockData.length }));
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchLoginHistory();
    } else if (activeTab === 'logs') {
      fetchOperationLogs();
    }
  }, [activeTab]);

  // 保存个人信息
  const handleSaveProfile = async (values) => {
    setLoading(true);
    try {
      // 由于后端暂未实现，这里模拟保存
      message.success('个人信息更新成功');
      setEditMode(false);
      setUserInfo({ ...userInfo, ...values });
      
      // 更新本地存储的用户信息
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...values }));
    } catch (error) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      const res = await changePassword(values);
      if (res.success) {
        message.success('密码修改成功，请重新登录');
        setPasswordModalVisible(false);
        passwordForm.resetFields();
        
        // 清除登录信息，跳转到登录页
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 1500);
      }
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      setLoading(false);
    }
  };

  // 上传头像
  const handleUploadAvatar = async (options) => {
    const { file, onSuccess, onError } = options;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      // 直接使用 fetch 发送请求，避免 axios 的问题
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/v1/profile/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const res = await response.json();
      
      if (res.success) {
        message.success('头像上传成功');
        onSuccess(res.data);
        
        // 更新用户信息，添加时间戳避免缓存
        const avatarUrl = res.data.avatar + '?t=' + Date.now();
        setUserInfo(prev => ({ 
          ...prev, 
          avatar: res.data.avatar  // 保存原始URL
        }));
        
        // 更新本地存储
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { 
          ...storedUser, 
          avatar: res.data.avatar 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // 触发头像更新事件
        eventBus.emit(EVENTS.AVATAR_UPDATED, res.data.avatar);
        eventBus.emit(EVENTS.USER_UPDATED, updatedUser);
        
        // 强制刷新用户信息
        await fetchUserInfo();
      } else {
        message.error(res.error || '上传失败');
        onError(new Error(res.error || '上传失败'));
      }
    } catch (error) {
      console.error('上传错误:', error);
      message.error('头像上传失败');
      onError(error);
    }
  };

  // 登录历史表格列
  const loginHistoryColumns = [
    {
      title: '登录时间',
      dataIndex: 'loginTime',
      key: 'loginTime',
      render: (text) => (
        <Space>
          <ClockCircleOutlined />
          {text}
        </Space>
      )
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      render: (text) => (
        <Space>
          <GlobalOutlined />
          {text}
        </Space>
      )
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      render: (text) => (
        <Space>
          <DesktopOutlined />
          {text}
        </Space>
      )
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      )
    }
  ];

  // 操作日志表格列
  const operationLogColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120
    },
    {
      title: '详情',
      dataIndex: 'content',
      key: 'content'
    }
  ];

  // Tabs 配置项
  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <>
          {/* 操作按钮放在表单外部 */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              {editMode ? (
                <>
                  <Button 
                    type="primary" 
                    loading={loading}
                    onClick={() => form.submit()}
                  >
                    <SaveOutlined /> 保存
                  </Button>
                  <Button onClick={() => {
                    setEditMode(false);
                    form.setFieldsValue({
                      username: userInfo.username,
                      name: userInfo.name,
                      phone: userInfo.phone,
                      email: userInfo.email
                    });
                  }}>
                    取消
                  </Button>
                </>
              ) : (
                <Button 
                  type="primary" 
                  onClick={() => setEditMode(true)}
                >
                  <EditOutlined /> 编辑信息
                </Button>
              )}
            </Space>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveProfile}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="username"
                  label="用户名"
                >
                  <Input 
                    prefix={<UserOutlined />} 
                    disabled 
                    placeholder="用户名不可修改"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label="姓名"
                  rules={editMode ? [{ required: true, message: '请输入姓名' }] : []}
                >
                  <Input 
                    prefix={<UserOutlined />} 
                    disabled={!editMode}
                    placeholder="请输入姓名"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="phone"
                  label="手机号"
                  rules={editMode ? [
                    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
                  ] : []}
                >
                  <Input 
                    prefix={<PhoneOutlined />} 
                    disabled={!editMode}
                    placeholder="请输入手机号"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="email"
                  label="邮箱"
                  rules={editMode ? [
                    { type: 'email', message: '请输入正确的邮箱' }
                  ] : []}
                >
                  <Input 
                    prefix={<MailOutlined />} 
                    disabled={!editMode}
                    placeholder="请输入邮箱"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </>
      )
    },
    {
      key: 'security',
      label: '安全设置',
      children: (
        <>
          <Card 
            title="密码管理" 
            size="small"
            extra={
              <Button 
                type="link" 
                onClick={() => setPasswordModalVisible(true)}
              >
                修改密码
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="security-item">
                <SafetyOutlined /> 
                <Text style={{ marginLeft: 8 }}>
                  为了账号安全，建议定期修改密码
                </Text>
              </div>
              <div className="security-item">
                <LockOutlined />
                <Text style={{ marginLeft: 8 }}>
                  密码强度：
                  <Tag color="green" style={{ marginLeft: 8 }}>强</Tag>
                </Text>
              </div>
            </Space>
          </Card>

          <Card 
            title="登录历史" 
            size="small" 
            style={{ marginTop: 16 }}
            extra={
              <Text type="secondary">最近20条记录</Text>
            }
          >
            <Table
              columns={loginHistoryColumns}
              dataSource={loginHistory}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </>
      )
    },
    {
      key: 'logs',
      label: '操作日志',
      children: (
        <Table
          columns={operationLogColumns}
          dataSource={operationLogs}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`
          }}
          locale={{
            emptyText: <Empty description="暂无操作记录" />
          }}
        />
      )
    }
  ];

  return (
    <div className="profile-page">
      <Row gutter={24}>
        {/* 左侧用户卡片 */}
        <Col xs={24} lg={8}>
          <Card className="user-card">
            <div className="avatar-section">
              <Upload
                name="avatar"
                showUploadList={false}
                customRequest={handleUploadAvatar}
                disabled={!editMode}
                accept="image/*"
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) {
                    message.error('只能上传图片文件！');
                    return false;
                  }
                  const isLt2M = file.size / 1024 / 1024 < 2;
                  if (!isLt2M) {
                    message.error('图片大小不能超过2MB！');
                    return false;
                  }
                  return true;
                }}
              >
                <Avatar 
                  size={120} 
                  icon={<UserOutlined />}
                  src={getAvatarUrl(userInfo.avatar)}
                  className="user-avatar"
                  style={{ cursor: editMode ? 'pointer' : 'default' }}
                />
                {editMode && (
                  <div className="upload-overlay">
                    <UploadOutlined /> 更换头像
                  </div>
                )}
              </Upload>
              <Title level={4} style={{ marginTop: 16 }}>{userInfo.name}</Title>
              <Text type="secondary">@{userInfo.username}</Text>
              <div className="role-tag">
                <Tag color={userInfo.role === 'admin' ? 'red' : 'blue'}>
                  {userInfo.role === 'admin' ? '管理员' : '员工'}
                </Tag>
                <Tag color={userInfo.status === 'active' ? 'green' : 'default'}>
                  {userInfo.status === 'active' ? '正常' : '禁用'}
                </Tag>
              </div>
            </div>
            
            <Divider />
            
            <Row gutter={16}>
              <Col span={12}>
                <Statistic 
                  title="账龄（天）" 
                  value={stats.accountAge} 
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="操作次数" 
                  value={stats.totalOperations}
                  prefix={<HistoryOutlined />}
                />
              </Col>
            </Row>
            
            <Divider />
            
            <Descriptions column={1} size="small">
              <Descriptions.Item label="注册时间">
                {userInfo.createdAt ? dayjs(userInfo.createdAt).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最后登录">
                {stats.lastLogin ? dayjs(stats.lastLogin).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 右侧详细信息 */}
        <Col xs={24} lg={16}>
          <Card>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              items={tabItems}
            />
          </Card>
        </Col>
      </Row>

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
              { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/, 
                message: '密码必须包含大小写字母和数字' }
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
    </div>
  );
};

export default Profile;