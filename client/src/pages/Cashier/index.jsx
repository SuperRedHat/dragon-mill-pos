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
import dayjs from 'dayjs';
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
  BarcodeOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { getCashierProducts, searchProducts, checkout, getTodayStats } from '@/api/cashier';
import { getMemberByPhone, searchMembers } from '@/api/members';
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
  //const memberSearchRef = useRef(null);

  const [memberSearchValue, setMemberSearchValue] = useState('');
  const [memberSearchOptions, setMemberSearchOptions] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityForm] = Form.useForm();

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

  // 修改为先打开数量输入弹窗
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setQuantityModalVisible(true);
    quantityForm.setFieldsValue({ quantity: 1 });
  };

  // 新增确认添加到购物车的函数
  const confirmAddToCart = (values) => {
    const product = selectedProduct;
    const quantity = parseFloat(values.quantity);
    
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + quantity);
    } else {
      setCart([...cart, {
        ...product,
        quantity: quantity,
        subtotal: (selectedMember && product.memberPrice ? product.memberPrice : product.price) * quantity
      }]);
    }
    
    message.success(`已添加 ${product.name} x ${quantity}${product.unit}`);
    setQuantityModalVisible(false);
    setSelectedProduct(null);
    quantityForm.resetFields();
  };

  // 更新商品数量
  const updateQuantity = (productId, quantity) => {
    // 如果数量无效或小于等于0，移除商品
    if (!quantity || quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => {
      if (item.id === productId) {
        const price = selectedMember && item.memberPrice ? item.memberPrice : item.price;
        return {
          ...item,
          quantity: parseFloat(quantity),  // 确保是数字类型
          subtotal: price * parseFloat(quantity)
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

  const handleMemberSearch = async (value) => {
    setMemberSearchValue(value);
    
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!value || value.length < 1) {
      setMemberSearchOptions([]);
      return;
    }
    
    // 防抖处理，300ms后才搜索
    searchTimeoutRef.current = setTimeout(async () => {
      setMemberSearchLoading(true);
      try {
        const res = await searchMembers(value);
        if (res.success) {
          const options = res.data.map(member => ({
            value: member.id.toString(),
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {member.phone} | 会员号: {member.memberNo}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Tag color="gold" style={{ marginBottom: 2 }}>
                    <GiftOutlined /> {member.points}积分
                  </Tag>
                  <div style={{ fontSize: '12px', color: '#52c41a' }}>
                    累计: ¥{parseFloat(member.totalConsumption || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            ),
            member: member  // 保存完整的会员信息
          }));
          setMemberSearchOptions(options);
        }
      } catch (error) {
        console.error('搜索会员失败:', error);
        setMemberSearchOptions([]);
      } finally {
        setMemberSearchLoading(false);
      }
    }, 300);
  };

  // 选择会员
  const handleSelectMember = (value, option) => {
    const member = option.member;
    setSelectedMember(member);
    message.success(`会员识别成功：${member.name}`);
    
    // 重新计算价格
    if (cart.length > 0) {
      setCart(cart.map(item => {
        const price = member && item.memberPrice ? item.memberPrice : item.price;
        return {
          ...item,
          subtotal: price * item.quantity
        };
      }));
    }
  };

  // 清除会员
  const handleClearMember = () => {
    setSelectedMember(null);
    setMemberSearchValue('');
    setMemberSearchOptions([]);
    
    // 恢复原价
    if (cart.length > 0) {
      setCart(cart.map(item => ({
        ...item,
        subtotal: item.price * item.quantity
      })));
    }
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
      width: 150,
      render: (quantity, record) => (
        <Space>
          <InputNumber
            size="small"
            min={0.1}
            step={0.5}
            max={record.stock}
            precision={2}  // 保留2位小数
            value={quantity}
            onChange={(value) => updateQuantity(record.id, value || 0)}
            style={{ width: 80 }}
          />
          <span style={{ fontSize: 12, color: '#666' }}>{record.unit}</span>
        </Space>
      )
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 90,
      render: (value) => (
        <span style={{ color: '#f5222d', fontWeight: 500 }}>
          ¥{value.toFixed(2)}
        </span>
      )
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
      onClick={() => handleProductClick(product)}
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
          库存: {product.stock}{product.unit}
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
              <AutoComplete
                value={memberSearchValue}
                options={memberSearchOptions}
                onSearch={handleMemberSearch}
                onSelect={handleSelectMember}
                onChange={(value) => {
                  setMemberSearchValue(value);
                  if (!value) {
                    handleClearMember();
                  }
                }}
                style={{ width: '100%' }}
                allowClear
                onClear={handleClearMember}
              >
                <Input
                  placeholder="输入会员号/姓名/手机号搜索"
                  prefix={<UserOutlined />}
                  suffix={
                    memberSearchLoading ? <Spin size="small" /> : null
                  }
                />
              </AutoComplete>
              
              {selectedMember && (
                <Card size="small" className="member-info" style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
                        {selectedMember.name[0]}
                      </Avatar>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {selectedMember.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {selectedMember.phone} | {selectedMember.memberNo}
                        </div>
                      </div>
                    </Space>
                    <div style={{ textAlign: 'right' }}>
                      <Tag color="gold" style={{ marginBottom: 4 }}>
                        <GiftOutlined /> {selectedMember.points} 积分
                      </Tag>
                      <div style={{ fontSize: '12px', color: '#52c41a' }}>
                        累计消费: ¥{parseFloat(selectedMember.totalConsumption || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <Row>
                      <Col span={12}>
                        入会日期: {dayjs(selectedMember.joinDate).format('YYYY-MM-DD')}
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        {selectedMember.birthday && (
                          <span>
                            <CalendarOutlined /> 生日: {dayjs(selectedMember.birthday).format('MM-DD')}
                          </span>
                        )}
                      </Col>
                    </Row>
                  </div>
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
                  <Col>商品种类：</Col>
                  <Col>
                    <strong>{cart.length}</strong> 种
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
      
      {/* 在支付弹窗后面添加数量输入弹窗 */}
      <Modal
        title={`请输入购买数量 - ${selectedProduct?.name}`}
        open={quantityModalVisible}
        onCancel={() => {
          setQuantityModalVisible(false);
          setSelectedProduct(null);
        }}
        footer={null}
        width={400}
      >
        {selectedProduct && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Tag color="blue">库存: {selectedProduct.stock} {selectedProduct.unit}</Tag>
              <Tag color="green">单价: ¥{selectedProduct.price}/{ selectedProduct.unit}</Tag>
              {selectedProduct.memberPrice && selectedMember && (
                <Tag color="gold">会员价: ¥{selectedProduct.memberPrice}/{selectedProduct.unit}</Tag>
              )}
            </div>
            
            <Form
              form={quantityForm}
              layout="vertical"
              onFinish={confirmAddToCart}
            >
              <Form.Item
                name="quantity"
                label={`购买数量（${selectedProduct.unit}）`}
                rules={[
                  { required: true, message: '请输入数量' },
                  { type: 'number', min: 0.1, message: '数量必须大于0' },
                  { type: 'number', max: selectedProduct.stock, message: '超出库存' }
                ]}
              >
                <InputNumber
                  min={0.1}
                  max={selectedProduct.stock}
                  step={0.5}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder={`请输入数量，当前库存 ${selectedProduct.stock} ${selectedProduct.unit}`}
                  addonAfter={selectedProduct.unit}
                />
              </Form.Item>
              
              <Form.Item>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button onClick={() => {
                    setQuantityModalVisible(false);
                    setSelectedProduct(null);
                  }}>
                    取消
                  </Button>
                  <Button type="primary" htmlType="submit">
                    加入购物车
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

    </div>
  );
};

export default Cashier;