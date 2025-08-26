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
  DatePicker,
  App,
  Row,
  Col,
  Statistic,
  Drawer,
  Descriptions,
  Timeline,
  Empty,
  InputNumber,
  Select,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  PhoneOutlined,
  GiftOutlined,
  DollarOutlined,
  CalendarOutlined,
  ExportOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getMemberList, createMember, updateMember, adjustMemberPoints } from '@/api/members';
import { getOrderList } from '@/api/orders';
import './index.scss';

const MemberList = () => {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState({});
  
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [memberOrders, setMemberOrders] = useState([]);
  const [pointsModalVisible, setPointsModalVisible] = useState(false);
  
  const [searchForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [pointsForm] = Form.useForm();
  const { message, modal } = App.useApp();

  // 获取当前用户角色
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin';

  // 获取会员列表
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await getMemberList({
        page: currentPage,
        pageSize,
        ...searchParams
      });
      if (res.success) {
        setMembers(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      message.error('获取会员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentPage, pageSize, searchParams]);

  // 搜索会员
  const handleSearch = (values) => {
    setSearchParams({
      keyword: values.keyword || '',
      status: values.status || ''
    });
    setCurrentPage(1);
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams({});
    setCurrentPage(1);
  };

  // 打开新建/编辑弹窗
  const handleOpenModal = (member = null) => {
    setEditingMember(member);
    setMemberModalVisible(true);
    if (member) {
      memberForm.setFieldsValue({
        ...member,
        birthday: member.birthday ? dayjs(member.birthday) : null
      });
    } else {
      memberForm.resetFields();
    }
  };

  // 提交会员信息
  const handleSubmitMember = async (values) => {
    try {
      const data = {
        name: values.name,
        phone: values.phone,
        birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : undefined,
        email: values.email && values.email.trim() ? values.email : undefined,  // 空字符串不发送
        remark: values.remark && values.remark.trim() ? values.remark : undefined,
        status: values.status
      };

      // 移除 undefined 的字段
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      if (editingMember) {
        await updateMember(editingMember.id, data);
        message.success('会员信息更新成功');
      } else {
        await createMember(data);
        message.success('会员创建成功');
      }
      
      setMemberModalVisible(false);
      memberForm.resetFields();
      fetchMembers();
    } catch (error) {
      // 错误已在请求拦截器中处理
    }
  };

  // 查看会员详情
  const handleViewDetail = async (member) => {
    setCurrentMember(member);
    setDetailDrawerVisible(true);
    
    // 获取消费记录
    try {
      const res = await getOrderList({
        memberId: member.id,
        page: 1,
        pageSize: 10
      });
      if (res.success) {
        setMemberOrders(res.data.list);
      }
    } catch (error) {
      console.error('获取消费记录失败');
    }
  };

  // 打开积分调整弹窗
  const handleOpenPointsModal = (member) => {
    setCurrentMember(member);
    setPointsModalVisible(true);
    pointsForm.resetFields();
  };

  // 调整积分
  const handleAdjustPoints = async (values) => {
    modal.confirm({
      title: '确认调整积分',
      content: `确定要${values.type === 'add' ? '增加' : '扣减'} ${values.points} 积分吗？`,
      onOk: async () => {
        try {
          await adjustMemberPoints(currentMember.id, values);
          message.success('积分调整成功');
          setPointsModalVisible(false);
          pointsForm.resetFields();
          fetchMembers();
        } catch (error) {
          // 错误已在请求拦截器中处理
        }
      }
    });
  };

  // 表格列配置
  const columns = [
    {
      title: '会员号',
      dataIndex: 'memberNo',
      key: 'memberNo',
      width: 120
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (name) => (
        <Space>
          <UserOutlined />
          {name}
        </Space>
      )
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (phone) => (
        <Space>
          <PhoneOutlined />
          {phone}
        </Space>
      )
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 100,
      render: (points) => (
        <Tag color="gold" icon={<GiftOutlined />}>
          {points}
        </Tag>
      )
    },
    {
      title: '累计消费',
      dataIndex: 'totalConsumption',
      key: 'totalConsumption',
      width: 120,
      render: (amount) => (
        <span style={{ color: '#52c41a' }}>
          ¥{parseFloat(amount || 0).toFixed(2)}
        </span>
      )
    },
    {
      title: '入会日期',
      dataIndex: 'joinDate',
      key: 'joinDate',
      width: 120,
      render: (date) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '正常' : '停用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          {isAdmin && (
            <Button
              type="link"
              size="small"
              onClick={() => handleOpenPointsModal(record)}
            >
              积分
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="member-list-page">
      <Card>
        {/* 搜索表单 */}
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="keyword">
            <Input
              placeholder="姓名/手机号/会员号"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          
          <Form.Item name="status">
            <Select
              placeholder="会员状态"
              allowClear
              style={{ width: 120 }}
            >
              <Select.Option value="active">正常</Select.Option>
              <Select.Option value="inactive">停用</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                重置
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenModal()}
              >
                新建会员
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
                <div style={{ 
                padding: '12px', 
                background: '#fafafa', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
                }}>
                <span style={{ color: '#999', fontSize: '13px' }}>会员总数</span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                    {total} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>人</span>
                </span>
                </div>
            </Col>
            <Col span={6}>
                <div style={{ 
                padding: '12px', 
                background: '#fafafa', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
                }}>
                <span style={{ color: '#999', fontSize: '13px' }}>今日新增</span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                    0 <span style={{ fontSize: '12px', fontWeight: 'normal' }}>人</span>
                </span>
                </div>
            </Col>
            <Col span={6}>
                <div style={{ 
                padding: '12px', 
                background: '#fafafa', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
                }}>
                <span style={{ color: '#999', fontSize: '13px' }}>本月新增</span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#faad14' }}>
                    0 <span style={{ fontSize: '12px', fontWeight: 'normal' }}>人</span>
                </span>
                </div>
            </Col>
            <Col span={6}>
                <div style={{ 
                padding: '12px', 
                background: '#fafafa', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
                }}>
                <span style={{ color: '#999', fontSize: '13px' }}>活跃会员</span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#13c2c2' }}>
                    {members.filter(m => m.status === 'active').length} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>人</span>
                </span>
                </div>
            </Col>
        </Row>

        {/* 会员列表 */}
        <Table
          loading={loading}
          columns={columns}
          dataSource={members}
          rowKey="id"
          scroll={{ x: 1000 }}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            }
          }}
        />
      </Card>

      {/* 新建/编辑会员弹窗 */}
      <Modal
        title={editingMember ? '编辑会员' : '新建会员'}
        open={memberModalVisible}
        onCancel={() => {
          setMemberModalVisible(false);
          memberForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={memberForm}
          layout="vertical"
          onFinish={handleSubmitMember}
        >
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
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
            ]}
          >
            <Input placeholder="请输入手机号" disabled={editingMember} />
          </Form.Item>

          <Form.Item name="birthday" label="生日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '邮箱格式不正确' }]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          {editingMember && (
            <Form.Item name="status" label="状态">
              <Select>
                <Select.Option value="active">正常</Select.Option>
                <Select.Option value="inactive">停用</Select.Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setMemberModalVisible(false);
                memberForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingMember ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 会员详情抽屉 */}
      <Drawer
        title="会员详情"
        placement="right"
        width={600}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        {currentMember && (
          <>
            <Descriptions title="基本信息" column={1} bordered>
              <Descriptions.Item label="会员号">{currentMember.memberNo}</Descriptions.Item>
              <Descriptions.Item label="姓名">{currentMember.name}</Descriptions.Item>
              <Descriptions.Item label="手机号">{currentMember.phone}</Descriptions.Item>
              <Descriptions.Item label="生日">
                {currentMember.birthday || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">{currentMember.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="当前积分">
                <Tag color="gold">{currentMember.points} 分</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="累计消费">
                <span style={{ color: '#52c41a' }}>
                  ¥{parseFloat(currentMember.totalConsumption || 0).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="入会日期">
                {dayjs(currentMember.joinDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={currentMember.status === 'active' ? 'success' : 'default'}>
                  {currentMember.status === 'active' ? '正常' : '停用'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="备注">
                {currentMember.remark || '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* 消费记录 */}
            <h4 style={{ marginTop: 24 }}>最近消费记录</h4>
            {memberOrders.length > 0 ? (
              <Timeline style={{ marginTop: 16 }}>
                {memberOrders.map(order => (
                  <Timeline.Item key={order.id}>
                    <p>{dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                    <p>订单号：{order.orderNo}</p>
                    <p>消费金额：¥{order.actualAmount.toFixed(2)}</p>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="暂无消费记录" />
            )}
          </>
        )}
      </Drawer>

      {/* 积分调整弹窗 */}
      {isAdmin && (
        <Modal
          title="积分调整"
          open={pointsModalVisible}
          onCancel={() => {
            setPointsModalVisible(false);
            pointsForm.resetFields();
          }}
          footer={null}
          width={400}
        >
          <Form
            form={pointsForm}
            layout="vertical"
            onFinish={handleAdjustPoints}
          >
            <Form.Item label="当前积分">
              <Input value={currentMember?.points || 0} disabled />
            </Form.Item>

            <Form.Item
              name="type"
              label="调整类型"
              rules={[{ required: true, message: '请选择调整类型' }]}
            >
              <Select placeholder="请选择">
                <Select.Option value="add">增加积分</Select.Option>
                <Select.Option value="deduct">扣减积分</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="points"
              label="调整数量"
              rules={[
                { required: true, message: '请输入调整数量' },
                { type: 'number', min: 1, message: '数量必须大于0' }
              ]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="reason"
              label="调整原因"
              rules={[{ required: true, message: '请输入调整原因' }]}
            >
              <Input.TextArea rows={3} placeholder="请输入调整原因" />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => {
                  setPointsModalVisible(false);
                  pointsForm.resetFields();
                }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  确认调整
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default MemberList;