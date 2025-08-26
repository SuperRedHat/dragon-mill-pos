import React, { useState, useEffect, useRef } from 'react';
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Table,
  InputNumber,
  Space,
  Tag,
  Divider,
  Modal,
  Form,
  Radio,
  App,
  Empty,
  Tabs,
  Badge,
  Avatar,
  List,
  Statistic,
  Typography,
  AutoComplete,
  Spin
} from 'antd';
import {
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  ClearOutlined,
  PrinterOutlined,
  WalletOutlined,
  CreditCardOutlined,
  AlipayCircleOutlined,
  WechatOutlined,
  DollarOutlined,
  GiftOutlined,
  BarcodeOutlined
} from '@ant-design/icons';
import { getCashierProducts, searchProducts, checkout, getTodayStats } from '@/api/cashier';
import { getMemberByPhone } from '@/api/members';
import './index.scss';

const { Search } = Input;
const { Text, Title } = Typography;

const Cashier = () => {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]); // 搜索结果
  const [searchKeyword, setSearchKeyword] = useState(''); // 搜索关键字
  const [showSearchResults, setShowSearchResults] = useState(false); // 是否显示搜索结果
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [todayStats, setTodayStats] = useState({
    totalAmount: 0,
    orderCount: 0,
    averageAmount: 0
  });
  const [activeTab, setActiveTab] = useState('all'); // 当前激活的标签
  
  const [paymentForm] = Form.useForm();
  const { message, modal } = App.useApp();
  const searchInputRef = useRef(null);
  const memberSearchRef = useRef(null);

  // 获取商品列表
  const fetchProducts = async () => {
    try {
      const res = await getCashierProducts();
      if (res.success) {
        setProducts(res.data);
      }
    } catch (error) {
      message.error('获取商品列表失败');
    }
  };

  // 获取今日统计
  const fetchTodayStats = async () => {
    try {
      const res = await getTodayStats();
      if (res.success) {
        setTodayStats(res.data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchTodayStats();
    
    // 定时刷新统计
    const timer = setInterval(fetchTodayStats, 60000); // 每分钟刷新
    
    return () => clearInterval(timer);
  }, []);

  // 添加商品到购物车
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        ...product,
        quantity: 1,
        subtotal: selectedMember && product.memberPrice ? product.memberPrice : product.price
      }]);
    }
    
    message.success(`已添加 ${product.name}`);
  };

  // 更新商品数量
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => {
      if (item.id === productId) {
        const price = selectedMember && item.memberPrice ? item.memberPrice : item.price;
        return {
          ...item,
          quantity,
          subtotal: price * quantity
        };
      }
      return item;
    }));
  };

  // 从购物车移除商品
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  // 清空购物车
  const clearCart = () => {
    modal.confirm({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      onOk: () => {
        setCart([]);
        message.info('购物车已清空');
      }
    });
  };

  // 搜索商品 - 修改搜索逻辑
  const handleProductSearch = async (value) => {
    setSearchKeyword(value);
    
    if (!value) {
      setSearchResults([]);
      setShowSearchResults(false);
      setActiveTab('all'); // 恢复显示全部商品
      return;
    }
    
    setSearchLoading(true);
    setActiveTab('search'); // 切换到搜索结果标签
    
    try {
      const res = await searchProducts(value);
      if (res.success) {
        setSearchResults(res.data);
        setShowSearchResults(true);
        
        if (res.data.length === 0) {
          message.warning('未找到相关商品');
        }
      }
    } catch (error) {
      message.error('搜索商品失败');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchKeyword('');
    setSearchResults([]);
    setShowSearchResults(false);
    setActiveTab('all');
    if (searchInputRef.current?.input) {
      searchInputRef.current.input.value = '';
    }
  };

  // 查找会员
  const handleMemberSearch = async (phone) => {
    if (!phone) {
      setSelectedMember(null);
      return;
    }
    
    try {
      const res = await getMemberByPhone(phone);
      if (res.success) {
        setSelectedMember(res.data);
        message.success(`会员识别成功：${res.data.name}`);
        
        // 重新计算价格
        if (cart.length > 0) {
          setCart(cart.map(item => {
            const price = res.data && item.memberPrice ? item.memberPrice : item.price;
            return {
              ...item,
              subtotal: price * item.quantity
            };
          }));
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        message.warning('会员不存在');
        setSelectedMember(null);
      }
    }
  };

  // 计算总金额
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // 开始结算
  const handleCheckout = () => {
    if (cart.length === 0) {
      message.warning('购物车不能为空');
      return;
    }
    
    setPaymentModalVisible(true);
    paymentForm.setFieldsValue({
      totalAmount: calculateTotal(),
      paymentMethod: 'cash',
      pointsUsed: 0
    });
  };

  // 打印小票函数
  const printReceipt = (orderData) => {
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>小票</title>
          <style>
            body { font-family: monospace; width: 300px; margin: 0 auto; }
            h3 { text-align: center; }
            hr { border: 1px dashed #000; }
            .row { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <h3>神龙磨坊</h3>
          <hr/>
          <p>订单号: ${orderData.orderNo}</p>
          <p>时间: ${orderData.createdAt}</p>
          <hr/>
          ${orderData.items.map(item => `
            <div class="row">
              <span>${item.productName} x${item.quantity}</span>
              <span>¥${item.subtotal.toFixed(2)}</span>
            </div>
          `).join('')}
          <hr/>
          <div class="row"><strong>合计:</strong><strong>¥${orderData.actualAmount.toFixed(2)}</strong></div>
          <hr/>
          <p style="text-align:center">谢谢惠顾</p>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // 确认支付
  const handlePayment = async (values) => {
    setCheckoutLoading(true);
    try {
      const orderData = {
        memberId: selectedMember?.id,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        paymentMethod: values.paymentMethod,
        pointsUsed: values.pointsUsed || 0,
        remark: values.remark
      };
      
      const res = await checkout(orderData);
      console.log('Checkout response:', res);
      if (res.success) {
        message.success('收银成功！');
        
        // 打印小票（这里简化处理）
        console.log('打印小票:', res.data);

        // 实际打印小票
        printReceipt(res.data);
        
        // 重置状态
        setCart([]);
        setSelectedMember(null);
        setPaymentModalVisible(false);
        paymentForm.resetFields();
        if (memberSearchRef.current?.input) {
        memberSearchRef.current.input.value = '';
        }
        
        clearSearch();
        fetchTodayStats();
      }
    } catch (error) {
      console.error('Payment error:', error); 
      message.error('结算失败');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // 购物车列配置
  const cartColumns = [
    {
      title: '商品',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      width: 80,
      render: (_, record) => {
        const price = selectedMember && record.memberPrice ? record.memberPrice : record.price;
        return (
          <span>
            ¥{price.toFixed(2)}
            {selectedMember && record.memberPrice && (
              <Tag color="red" style={{ marginLeft: 4 }}>会员价</Tag>
            )}
          </span>
        );
      }
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (quantity, record) => (
        <Space>
          <Button
            size="small"
            icon={<MinusOutlined />}
            onClick={() => updateQuantity(record.id, quantity - 1)}
          />
          <InputNumber
            size="small"
            min={1}
            max={record.stock}
            value={quantity}
            onChange={(value) => updateQuantity(record.id, value)}
            style={{ width: 50 }}
          />
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => updateQuantity(record.id, quantity + 1)}
            disabled={quantity >= record.stock}
          />
        </Space>
      )
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 90,
      render: (value) => `¥${value.toFixed(2)}`
    },
    {
      title: '操作',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => removeFromCart(record.id)}
        />
      )
    }
  ];

  // 渲染商品卡片
  const renderProductCard = (product) => (
    <Card
      hoverable
      className="product-item"
      onClick={() => addToCart(product)}
    >
      <div className="product-image">
        {product.image ? (
          <img src={product.image} alt={product.name} />
        ) : (
          <Avatar size={64} icon={<ShoppingCartOutlined />} />
        )}
      </div>
      <div className="product-info">
        <div className="product-name">{product.name}</div>
        <div className="product-price">
          ¥{product.price.toFixed(2)}
          {product.memberPrice && (
            <span className="member-price">
              会员价:¥{product.memberPrice.toFixed(2)}
            </span>
          )}
        </div>
        <div className="product-stock">
          库存: {product.stock}
          {product.barcode && (
            <div className="product-barcode">
              <BarcodeOutlined /> {product.barcode}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  // Tab 配置
  const tabItems = [
    {
      key: 'all',
      label: '全部商品',
      children: (
        <div className="products-grid">
          {Object.keys(products).map(category => (
            <div key={category}>
              <Divider orientation="left">{category}</Divider>
              <Row gutter={[12, 12]}>
                {products[category]?.map(product => (
                  <Col key={product.id} xs={12} sm={8} md={6}>
                    {renderProductCard(product)}
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </div>
      )
    },
    {
      key: 'search',
      label: (
        <Badge count={searchResults.length} offset={[10, 0]}>
          搜索结果
        </Badge>
      ),
      children: (
        <div className="search-results-container">
          {searchLoading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>搜索中...</div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="products-grid">
              <div>
                <Divider orientation="left">
                  搜索 "{searchKeyword}" 找到 {searchResults.length} 个商品
                  <Button 
                    type="link" 
                    size="small"
                    onClick={clearSearch}
                    style={{ marginLeft: 16 }}
                  >
                    清除搜索
                  </Button>
                </Divider>
                <Row gutter={[12, 12]}>
                  {searchResults.map(product => (
                    <Col key={product.id} xs={12} sm={8} md={6}>
                      {renderProductCard(product)}
                    </Col>
                  ))}
                </Row>
              </div>
            </div>
          ) : (
            <Empty 
              description={`未找到 "${searchKeyword}" 相关商品`}
              style={{ padding: 50 }}
            >
              <Button onClick={clearSearch}>返回全部商品</Button>
            </Empty>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="cashier-page">
      <Row gutter={16}>
        {/* 左侧商品区域 */}
        <Col xs={24} lg={14}>
          <Card className="products-card">
            <div className="search-bar">
              <Search
                ref={searchInputRef}
                placeholder="输入商品名称、拼音或条码搜索"
                prefix={<SearchOutlined />}
                enterButton="搜索"
                size="large"
                loading={searchLoading}
                onSearch={handleProductSearch}
                onChange={(e) => {
                  if (!e.target.value) {
                    clearSearch();
                  }
                }}
                autoFocus
                allowClear
              />
              {/* 快速提示 */}
              {searchKeyword && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                  提示：点击商品可添加到购物车
                </div>
              )}
            </div>

            <Tabs 
              activeKey={activeTab}
              onChange={setActiveTab}
              className="products-tabs"
              items={tabItems}
            />
          </Card>
        </Col>

        {/* 右侧购物车区域 */}
        <Col xs={24} lg={10}>
          <Card className="cart-card">
            {/* 会员信息 */}
            <div className="member-section">
              <Search
                ref={memberSearchRef}
                placeholder="输入会员手机号"
                prefix={<UserOutlined />}
                enterButton="查找"
                onSearch={handleMemberSearch}
                allowClear
              />
              {selectedMember && (
                <Card size="small" className="member-info">
                  <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <div><strong>{selectedMember.name}</strong></div>
                      <div>
                        <Tag color="gold">
                          <GiftOutlined /> {selectedMember.points} 积分
                        </Tag>
                      </div>
                    </div>
                  </Space>
                </Card>
              )}
            </div>

            <Divider />

            {/* 购物车列表 */}
            <div className="cart-list">
              {cart.length > 0 ? (
                <Table
                  dataSource={cart}
                  columns={cartColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ y: 300 }}
                />
              ) : (
                <Empty 
                  description="购物车为空"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>

            {/* 结算区域 */}
            <div className="checkout-section">
              <div className="total-info">
                <Row justify="space-between">
                  <Col>商品数量：</Col>
                  <Col>
                    <strong>{cart.reduce((sum, item) => sum + item.quantity, 0)}</strong> 件
                  </Col>
                </Row>
                <Row justify="space-between" className="total-amount">
                  <Col>应付金额：</Col>
                  <Col>
                    <Text strong style={{ fontSize: 24, color: '#f5222d' }}>
                      ¥{calculateTotal().toFixed(2)}
                    </Text>
                  </Col>
                </Row>
              </div>

              <Space style={{ width: '100%' }} direction="vertical">
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<WalletOutlined />}
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                >
                  结算收款
                </Button>
                <Button
                  size="large"
                  block
                  danger
                  icon={<ClearOutlined />}
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  清空购物车
                </Button>
              </Space>
            </div>

            <Divider />

            {/* 今日统计 */}
            <div className="today-stats">
              <Title level={5}>今日统计</Title>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="销售额"
                    value={todayStats.totalAmount}
                    prefix="¥"
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="订单数"
                    value={todayStats.orderCount}
                    suffix="单"
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="客单价"
                    value={todayStats.averageAmount}
                    prefix="¥"
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 支付弹窗 */}
      <Modal
        title="确认支付"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handlePayment}
        >
          <Form.Item label="应付金额">
            <Input
              value={`¥${calculateTotal().toFixed(2)}`}
              disabled
              style={{ fontSize: 20, fontWeight: 'bold', color: '#f5222d' }}
            />
          </Form.Item>

          {selectedMember && (
            <Form.Item
              name="pointsUsed"
              label={`使用积分（可用：${selectedMember.points}）`}
            >
              <InputNumber
                min={0}
                max={Math.min(selectedMember.points, calculateTotal() * 100)}
                style={{ width: '100%' }}
                placeholder="输入使用的积分数量"
              />
            </Form.Item>
          )}

          <Form.Item
            name="paymentMethod"
            label="支付方式"
            rules={[{ required: true, message: '请选择支付方式' }]}
          >
            <Radio.Group size="large" style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio.Button value="cash" style={{ width: '100%' }}>
                  <DollarOutlined /> 现金
                </Radio.Button>
                <Radio.Button value="wechat" style={{ width: '100%' }}>
                  <WechatOutlined style={{ color: '#52c41a' }} /> 微信支付
                </Radio.Button>
                <Radio.Button value="alipay" style={{ width: '100%' }}>
                  <AlipayCircleOutlined style={{ color: '#1890ff' }} /> 支付宝
                </Radio.Button>
                <Radio.Button value="card" style={{ width: '100%' }}>
                  <CreditCardOutlined /> 银行卡
                </Radio.Button>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="选填" />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setPaymentModalVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={checkoutLoading}
                icon={<PrinterOutlined />}
              >
                确认支付并打印小票
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Cashier;