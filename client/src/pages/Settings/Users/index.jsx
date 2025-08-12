import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  App,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Drawer,
  Timeline,
  Empty,
  Tabs
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  UndoOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import {
  getUserList,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  restoreUser,
  getDeletedUsers,
  getUserLogs
} from '@/api/users';
import './index.scss';

const { Option } = Select;

const UserManagement = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState({});
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('create'); // create | edit
  const [currentUser, setCurrentUser] = useState(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [logDrawerVisible, setLogDrawerVisible] = useState(false);
  const [userLogs, setUserLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [searchForm] = Form.useForm();
  const { message } = App.useApp();

  // 获取当前登录用户
  const currentLoginUser = JSON.parse(localStorage.getItem('user') || '{}');

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUserList({
        page: currentPage,
        pageSize,
        ...searchParams
      });
      if (res.success) {
        setUsers(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      setLoading(false);
    }
  };

  // 获取已删除用户列表
  const fetchDeletedUsers = async () => {
    setLoading(true);
    try {
      const res = await getDeletedUsers();
      if (res.success) {
        setDeletedUsers(res.data);
      }
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'active') {
      fetchUsers();
    } else {
      fetchDeletedUsers();
    }
  }, [currentPage, pageSize, searchParams, activeTab]);

  // 搜索
  const handleSearch = (values) => {
    setSearchParams(values);
    setCurrentPage(1);
  };

  // 重置搜索
  const handleResetSearch = () => {
    searchForm.resetFields();
    setSearchParams({});
    setCurrentPage(1);
  };

  // 打开新建/编辑弹窗
  const handleOpenModal = (type, user = null) => {
    setModalType(type);
    setCurrentUser(user);
    setModalVisible(true);
    
    if (type === 'edit' && user) {
      form.setFieldsValue({
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status
      });
    } else {
      form.resetFields();
    }
  };

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      if (modalType === 'create') {
        const res = await createUser(values);
        if (res.success) {
          message.success('用户创建成功');
          setModalVisible(false);
          fetchUsers();
        }
      } else {
        const res = await updateUser(currentUser.id, values);
        if (res.success) {
          message.success('用户更新成功');
          setModalVisible(false);
          fetchUsers();
        }
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 删除用户
  const handleDelete = async (id) => {
    try {
      const res = await deleteUser(id);
      if (res.success) {
        message.success('用户删除成功');
        fetchUsers();
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 恢复用户
  const handleRestore = async (id) => {
    try {
      const res = await restoreUser(id);
      if (res.success) {
        message.success('用户恢复成功');
        fetchDeletedUsers();
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 重置密码
  const handleResetPassword = async (values) => {
    try {
      const res = await resetPassword(currentUser.id, values.password);
      if (res.success) {
        message.success('密码重置成功');
        setPasswordModalVisible(false);
        passwordForm.resetFields();
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 查看操作日志
  const handleViewLogs = async (user) => {
    setCurrentUser(user);
    setLogDrawerVisible(true);
    try {
      const res = await getUserLogs(user.id, { page: 1, pageSize: 50 });
      if (res.success) {
        setUserLogs(res.data.list);
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 表格列配置
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (text) => text || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '员工'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => {
        const isCurrentUser = record.id === currentLoginUser.id;
        return (
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenModal('edit', record)}
              />
            </Tooltip>
            <Tooltip title="重置密码">
              <Button
                type="link"
                size="small"
                icon={<LockOutlined />}
                onClick={() => {
                  setCurrentUser(record);
                  setPasswordModalVisible(true);
                }}
              />
            </Tooltip>
            <Tooltip title="操作日志">
              <Button
                type="link"
                size="small"
                icon={<HistoryOutlined />}
                onClick={() => handleViewLogs(record)}
              />
            </Tooltip>
            <Popconfirm
              title="确定要删除该用户吗？"
              description="删除后可以在已删除列表中恢复"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
              disabled={isCurrentUser}
            >
              <Tooltip title={isCurrentUser ? '不能删除自己' : '删除'}>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={isCurrentUser}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // 已删除用户列配置
  const deletedColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '员工'}
        </Tag>
      ),
    },
    {
      title: '删除时间',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确定要恢复该用户吗？"
          onConfirm={() => handleRestore(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="link"
            icon={<UndoOutlined />}
          >
            恢复
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // Tab 项配置
  const tabItems = [
    {
      key: 'active',
      label: '用户列表',
      children: (
        <>
          {/* 搜索栏 */}
          <Form
            form={searchForm}
            layout="inline"
            onFinish={handleSearch}
            style={{ marginBottom: 16 }}
          >
            <Form.Item name="keyword">
              <Input
                placeholder="搜索用户名/姓名/手机号"
                prefix={<SearchOutlined />}
                allowClear
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item name="role">
              <Select
                placeholder="选择角色"
                allowClear
                style={{ width: 120 }}
              >
                <Option value="admin">管理员</Option>
                <Option value="staff">员工</Option>
              </Select>
            </Form.Item>
            <Form.Item name="status">
              <Select
                placeholder="选择状态"
                allowClear
                style={{ width: 120 }}
              >
                <Option value="active">正常</Option>
                <Option value="inactive">禁用</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  查询
                </Button>
                <Button onClick={handleResetSearch}>
                  重置
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenModal('create')}
                >
                  新建用户
                </Button>
              </Space>
            </Form.Item>
          </Form>

          {/* 用户表格 */}
          <Table
            loading={loading}
            columns={columns}
            dataSource={users}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
          />
        </>
      )
    },
    {
      key: 'deleted',
      label: '已删除用户',
      children: (
        <Table
          loading={loading}
          columns={deletedColumns}
          dataSource={deletedUsers}
          rowKey="id"
          pagination={false}
          locale={{
            emptyText: <Empty description="暂无已删除用户" />
          }}
        />
      )
    }
  ];

  return (
    <div className="user-management">
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* 新建/编辑用户弹窗 */}
      <Modal
        title={modalType === 'create' ? '新建用户' : '编辑用户'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {modalType === 'create' && (
            <>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '用户名只能包含字母、数字和下划线，长度3-20位' }
                ]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码长度至少6位' }
                ]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </>
          )}
          
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
            initialValue="staff"
          >
            <Select
              disabled={modalType === 'edit' && currentUser?.id === currentLoginUser.id}
            >
              <Option value="admin">管理员</Option>
              <Option value="staff">员工</Option>
            </Select>
          </Form.Item>
          
          {modalType === 'edit' && (
            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select
                disabled={currentUser?.id === currentLoginUser.id}
              >
                <Option value="active">正常</Option>
                <Option value="inactive">禁用</Option>
              </Select>
            </Form.Item>
          )}
          
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码弹窗 */}
      <Modal
        title={`重置密码 - ${currentUser?.name}`}
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleResetPassword}
        >
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
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
              <Button type="primary" htmlType="submit">
                确定
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 操作日志抽屉 */}
      <Drawer
        title={`操作日志 - ${currentUser?.name}`}
        placement="right"
        width={600}
        open={logDrawerVisible}
        onClose={() => {
          setLogDrawerVisible(false);
          setUserLogs([]);
        }}
      >
        {userLogs.length > 0 ? (
          <Timeline mode="left">
            {userLogs.map((log) => (
              <Timeline.Item
                key={log.id}
                label={new Date(log.createdAt).toLocaleString()}
              >
                <p>
                  <strong>{log.module}</strong> - {log.action}
                </p>
                {log.content && <p>{log.content}</p>}
                {log.ip && <p style={{ fontSize: 12, color: '#999' }}>IP: {log.ip}</p>}
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Empty description="暂无操作日志" />
        )}
      </Drawer>
    </div>
  );
};

export default UserManagement;