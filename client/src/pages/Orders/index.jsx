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
  Select,
  App,
  Descriptions,
  Divider,
  Row,
  Col,
  Statistic,
  Timeline,
  Empty,
  Drawer
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  RollbackOutlined,
  PrinterOutlined,
  ExportOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getOrderList, getOrderDetail, refundOrder } from '@/api/orders';
import './index.scss';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const Orders = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  
  const [searchForm] = Form.useForm();
  const [refundForm] = Form.useForm();
  const { message, modal } = App.useApp();

  // 获取当前登录用户
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // 获取订单列表
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrderList({
        page: currentPage,
        pageSize,
        ...searchParams
      });
      if (res.success) {
        setOrders(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPage, pageSize, searchParams]);

  // 查询订单
  const handleSearch = (values) => {
    const params = {};
    
    if (values.orderNo) {
      params.orderNo = values.orderNo;
    }

    // 新增会员搜索参数
    if (values.memberKeyword) {
      params.memberKeyword = values.memberKeyword;
    }
    
    if (values.dateRange) {
      params.startDate = values.dateRange[0].format('YYYY-MM-DD');
      params.endDate = values.dateRange[1].format('YYYY-MM-DD');
    }
    
    if (values.status) {
      params.status = values.status;
    }
    
    setSearchParams(params);
    setCurrentPage(1);
  };

  // 重置查询
  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams({});
    setCurrentPage(1);
  };

  // 查看订单详情
  const handleViewDetail = async (order) => {
    setLoading(true);
    try {
      const res = await getOrderDetail(order.id);
      if (res.success) {
        setCurrentOrder(res.data);
        setDetailVisible(true);
      }
    } catch (error) {
      message.error('获取订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开退货弹窗
  const handleOpenRefund = (order) => {
    if (order.status !== 'completed') {
      message.warning('只有已完成的订单才能退货');
      return;
    }
    
    setCurrentOrder(order);
    setSelectedItems([]);
    setRefundModalVisible(true);
  };

  // 处理退货
  const handleRefund = async (values) => {
    modal.confirm({
      title: '确认退货',
      content: '确定要对该订单进行退货处理吗？',
      onOk: async () => {
        setLoading(true);
        try {
          const res = await refundOrder(currentOrder.id, {
            reason: values.reason,
            items: selectedItems.length > 0 ? selectedItems : null
          });
          
          if (res.success) {
            message.success('退货处理成功');
            setRefundModalVisible(false);
            refundForm.resetFields();
            fetchOrders();
          }
        } catch (error) {
          message.error('退货处理失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // 打印订单
  const handlePrint = (order) => {
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>订单详情</title>
          <style>
            body { font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h2>神龙磨坊 - 订单详情</h2>
          <p><strong>订单号：</strong>${order.orderNo}</p>
          <p><strong>时间：</strong>${order.createdAt}</p>
          <p><strong>会员：</strong>${order.member?.name || '非会员'}</p>
          <p><strong>收银员：</strong>${order.cashier?.name}</p>
          <hr/>
          <table>
            <thead>
              <tr>
                <th>商品名称</th>
                <th>单价</th>
                <th>数量</th>
                <th>小计</th>
              </tr>
            </thead>
            <tbody>
              ${currentOrder?.items?.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>¥${item.price.toFixed(2)}</td>
                  <td>${item.quantity}</td>
                  <td>¥${item.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <hr/>
          <p style="text-align: right;">
            <strong>总金额：</strong>¥${order.totalAmount.toFixed(2)}<br/>
            <strong>优惠金额：</strong>¥${order.discountAmount.toFixed(2)}<br/>
            <strong>实付金额：</strong>¥${order.actualAmount.toFixed(2)}
          </p>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // 订单状态标签
  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'processing', text: '待处理' },
      completed: { color: 'success', text: '已完成' },
      cancelled: { color: 'default', text: '已取消' },
      refunded: { color: 'error', text: '已退货' }
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 支付方式标签
  const getPaymentTag = (method) => {
    const methodMap = {
      cash: { color: 'green', text: '现金' },
      wechat: { color: 'green', text: '微信' },
      alipay: { color: 'blue', text: '支付宝' },
      card: { color: 'purple', text: '银行卡' }
    };
    const config = methodMap[method] || { color: 'default', text: method };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 表格列配置
  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
      fixed: 'left'
    },
    {
      title: '会员',
      dataIndex: 'member',
      key: 'member',
      width: 100,
      render: (member) => member ? (
        <Space>
          <UserOutlined />
          {member.name}
        </Space>
      ) : '非会员'
    },
    {
      title: '金额',
      dataIndex: 'actualAmount',
      key: 'actualAmount',
      width: 100,
      render: (amount) => <span style={{ color: '#f5222d' }}>¥{amount.toFixed(2)}</span>
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 100,
      render: (method) => getPaymentTag(method)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: '收银员',
      dataIndex: 'cashier',
      key: 'cashier',
      width: 100,
      render: (cashier) => cashier?.name
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
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
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => {
              setCurrentOrder(record);
              handleViewDetail(record).then(() => handlePrint(record));
            }}
          >
            打印
          </Button>
          {currentUser.role === 'admin' && record.status === 'completed' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<RollbackOutlined />}
              onClick={() => handleOpenRefund(record)}
            >
              退货
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="orders-page">
      <Card>
        {/* 查询表单 */}
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="orderNo">
            <Input
              placeholder="订单号"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          
          <Form.Item name="memberKeyword">
            <Input
              placeholder="会员号/姓名/手机号"
              prefix={<UserOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>

          <Form.Item name="dateRange">
            <RangePicker 
              placeholder={['开始日期', '结束日期']}
              style={{ width: 240 }}
            />
          </Form.Item>
          
          <Form.Item name="status">
            <Select
              placeholder="订单状态"
              allowClear
              style={{ width: 120 }}
            >
              <Select.Option value="completed">已完成</Select.Option>
              <Select.Option value="refunded">已退货</Select.Option>
              <Select.Option value="cancelled">已取消</Select.Option>
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
            </Space>
          </Form.Item>
        </Form>

        {/* 订单列表 */}
        <Table
          loading={loading}
          columns={columns}
          dataSource={orders}
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
            }
          }}
        />
      </Card>

      {/* 订单详情抽屉 */}
      <Drawer
        title="订单详情"
        placement="right"
        width={800}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => handlePrint(currentOrder)}>
              打印
            </Button>
            {currentUser.role === 'admin' && currentOrder?.status === 'completed' && (
              <Button 
                danger 
                icon={<RollbackOutlined />}
                onClick={() => {
                  setDetailVisible(false);
                  handleOpenRefund(currentOrder);
                }}
              >
                退货
              </Button>
            )}
          </Space>
        }
      >
        {currentOrder && (
          <>
            {/* 订单信息 */}
            <Descriptions title="订单信息" column={2} bordered>
              <Descriptions.Item label="订单号">{currentOrder.orderNo}</Descriptions.Item>
              <Descriptions.Item label="状态">{getStatusTag(currentOrder.status)}</Descriptions.Item>
              <Descriptions.Item label="下单时间">{dayjs(currentOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="收银员">{currentOrder.cashier?.name}</Descriptions.Item>
              <Descriptions.Item label="会员">{currentOrder.member?.name || '非会员'}</Descriptions.Item>
              <Descriptions.Item label="会员电话">{currentOrder.member?.phone || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* 商品明细 */}
            <h4>商品明细</h4>
            <Table
              dataSource={currentOrder.items}
              rowKey="id"
              pagination={false}
              size="small"
              expandable={{
                expandedRowRender: (record) => {
                  // 如果是配方项，展示材料明细
                  if (record.isRecipe && record.recipeDetails) {
                    return (
                      <div style={{ padding: '12px', background: '#fafafa', borderRadius: 4 }}>
                        <div style={{ fontWeight: 500, marginBottom: 12 }}>
                          配方材料明细（{record.recipeDetails.weight}g）：
                        </div>
                        <Row gutter={[16, 8]}>
                          {record.recipeDetails.materials?.map((material, idx) => (
                            <Col key={idx} span={8}>
                              <Card size="small" style={{ borderColor: '#ffe58f' }}>
                                <div style={{ fontWeight: 500 }}>{material.name}</div>
                                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                  <Space>
                                    <span>配比: {material.percentage}%</span>
                                    <Divider type="vertical" />
                                    <span>重量: {material.gramAmount?.toFixed(1)}g</span>
                                  </Space>
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                        {record.recipeDetails.processingFee && (
                          <div style={{ marginTop: 12, textAlign: 'right', color: '#666' }}>
                            加工费: ¥{record.recipeDetails.processingFee}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                },
                rowExpandable: (record) => record.isRecipe && record.recipeDetails
              }}
              columns={[
                {
                  title: '',
                  width: 30,
                  render: (_, record) => {
                    if (record.isRecipe && record.recipeDetails) {
                      return (
                        <Tooltip title="点击展开配方详情">
                          <ExperimentOutlined style={{ color: '#1890ff' }} />
                        </Tooltip>
                      );
                    }
                    return null;
                  }
                },
                {
                  title: '商品名称',
                  dataIndex: 'productName',
                  key: 'productName',
                  render: (text, record) => {
                    if (record.isRecipe) {
                      return (
                        <Space>
                          <Tag color="blue" icon={<ExperimentOutlined />}>配方</Tag>
                          <span>{text}</span>
                          {record.recipeDetails?.weight && (
                            <Tag color="green">{record.recipeDetails.weight}g</Tag>
                          )}
                        </Space>
                      );
                    }
                    return text;
                  }
                },
                {
                  title: '单价',
                  dataIndex: 'price',
                  key: 'price',
                  render: (price, record) => (
                    <span>
                      ¥{price.toFixed(2)}
                      {record.unit && (
                        <span style={{ fontSize: 12, color: '#999' }}>/{record.unit}</span>
                      )}
                    </span>
                  )
                },
                {
                  title: '数量',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  render: (quantity, record) => (
                    <span>
                      {quantity}
                      {record.unit && (
                        <span style={{ marginLeft: 4, fontSize: 12, color: '#666' }}>
                          {record.unit}
                        </span>
                      )}
                    </span>
                  )
                },
                {
                  title: '小计',
                  dataIndex: 'subtotal',
                  key: 'subtotal',
                  render: (subtotal) => `¥${subtotal.toFixed(2)}`
                },
                {
                  title: '状态',
                  dataIndex: 'isRefunded',
                  key: 'isRefunded',
                  render: (isRefunded) => isRefunded ? 
                    <Tag color="error">已退货</Tag> : 
                    <Tag color="success">正常</Tag>
                }
              ]}
            />

            <Divider />

            {/* 金额信息 */}
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="商品总额"
                  value={currentOrder.totalAmount}
                  prefix="¥"
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="优惠金额"
                  value={currentOrder.discountAmount}
                  prefix="¥"
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="实付金额"
                  value={currentOrder.actualAmount}
                  prefix="¥"
                  precision={2}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>

            <Divider />

            {/* 支付信息 */}
            <Descriptions title="支付信息" column={2} bordered>
              <Descriptions.Item label="支付方式">
                {getPaymentTag(currentOrder.paymentMethod)}
              </Descriptions.Item>
              <Descriptions.Item label="使用积分">{currentOrder.pointsUsed || 0}</Descriptions.Item>
              <Descriptions.Item label="获得积分">{currentOrder.pointsEarned || 0}</Descriptions.Item>
              <Descriptions.Item label="备注">{currentOrder.remark || '-'}</Descriptions.Item>
            </Descriptions>

            {/* 退货信息 */}
            {currentOrder.status === 'refunded' && (
              <>
                <Divider />
                <Descriptions title="退货信息" column={2} bordered>
                  <Descriptions.Item label="退货时间">
                    {dayjs(currentOrder.refundedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  <Descriptions.Item label="退货原因" span={2}>
                    {currentOrder.refundReason}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </>
        )}
      </Drawer>

      {/* 退货弹窗 */}
      <Modal
        title="订单退货"
        open={refundModalVisible}
        onCancel={() => {
          setRefundModalVisible(false);
          refundForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={refundForm}
          layout="vertical"
          onFinish={handleRefund}
        >
          <Form.Item label="订单信息">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="订单号">{currentOrder?.orderNo}</Descriptions.Item>
              <Descriptions.Item label="金额">¥{currentOrder?.actualAmount.toFixed(2)}</Descriptions.Item>
            </Descriptions>
          </Form.Item>

          <Form.Item
            name="reason"
            label="退货原因"
            rules={[{ required: true, message: '请填写退货原因' }]}
          >
            <TextArea rows={4} placeholder="请输入退货原因" />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setRefundModalVisible(false);
                refundForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" danger loading={loading}>
                确认退货
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Orders;