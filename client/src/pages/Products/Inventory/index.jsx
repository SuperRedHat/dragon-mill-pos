import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Alert,
  Badge,
  Progress,
  App,
  Tabs,
  Input,
  Select,
  Form,
  Empty,
  Tooltip,
  Modal,
  InputNumber,
  DatePicker,
  Divider,
  Result,
  Typography,
  Spin
} from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  FileExcelOutlined,
  DollarOutlined,
  PlusOutlined,
  MinusOutlined
} from '@ant-design/icons';
import { 
  getProductList, 
  adjustStock, 
  batchReplenish,
  getReplenishSuggestions 
} from '@/api/products';
import { getCategoryList } from '@/api/productCategories';
import dayjs from 'dayjs';
import './index.scss';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;

const InventoryManagement = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  
  const [replenishList, setReplenishList] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [replenishSummary, setReplenishSummary] = useState({
    totalQuantity: 0,
    totalCost: 0
  });

  
  const [searchForm] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [stockForm] = Form.useForm();
  const { message, modal } = App.useApp();

  
  
  

  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    outOfStock: 0,
    lowStock: 0,
    normalStock: 0,
    highStock: 0,
    totalValue: 0
  });

  // 获取当前用户角色
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin';

  // 获取所有商品数据
  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      // 获取分类列表
      const catRes = await getCategoryList({ status: 'active' });
      if (catRes.success) {
        setCategories(catRes.data);
      }

      // 获取所有商品
      const res = await getProductList({
        page: 1,
        pageSize: 1000 // 获取所有商品
      });
      
      if (res.success) {
        const productList = res.data.list;
        
        // 计算统计数据
        const statistics = productList.reduce((acc, product) => {
          acc.total++;
          acc.totalValue += (product.stock * product.price);
          
          if (product.stock === 0) {
            acc.outOfStock++;
          } else if (product.stock <= product.minStock) {
            acc.lowStock++;
          } else if (product.stock >= product.maxStock) {
            acc.highStock++;
          } else {
            acc.normalStock++;
          }
          
          return acc;
        }, {
          total: 0,
          outOfStock: 0,
          lowStock: 0,
          normalStock: 0,
          highStock: 0,
          totalValue: 0
        });
        
        setStats(statistics);
        setProducts(productList);
        filterProductsByTab(activeTab, productList);
      }
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      setLoading(false);
    }
  };

  // 根据标签页筛选商品
  const filterProductsByTab = (tab, productList = products) => {
    let filtered = [];
    
    switch (tab) {
      case 'out':
        filtered = productList.filter(p => p.stock === 0);
        break;
      case 'low':
        filtered = productList.filter(p => p.stock > 0 && p.stock <= p.minStock);
        break;
      case 'high':
        filtered = productList.filter(p => p.stock >= p.maxStock);
        break;
      case 'normal':
        filtered = productList.filter(p => p.stock > p.minStock && p.stock < p.maxStock);
        break;
      default:
        filtered = productList;
    }
    
    setFilteredProducts(filtered);
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  useEffect(() => {
    filterProductsByTab(activeTab);
  }, [activeTab, products]);

  // 搜索商品
  const handleSearch = (values) => {
    let filtered = [...products];
    
    // 根据当前标签页预筛选
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'out':
          filtered = filtered.filter(p => p.stock === 0);
          break;
        case 'low':
          filtered = filtered.filter(p => p.stock > 0 && p.stock <= p.minStock);
          break;
        case 'high':
          filtered = filtered.filter(p => p.stock >= p.maxStock);
          break;
        case 'normal':
          filtered = filtered.filter(p => p.stock > p.minStock && p.stock < p.maxStock);
          break;
      }
    }
    
    // 应用搜索条件
    if (values.keyword) {
      filtered = filtered.filter(p => 
        p.name.includes(values.keyword) ||
        p.shortName?.includes(values.keyword) ||
        p.barcode?.includes(values.keyword)
      );
    }
    
    if (values.categoryId) {
      filtered = filtered.filter(p => p.categoryId === values.categoryId);
    }
    
    setFilteredProducts(filtered);
  };

  // 重置搜索
  const handleResetSearch = () => {
    searchForm.resetFields();
    filterProductsByTab(activeTab);
  };

  const handleExport = () => {
    // 简单的导出功能实现
    Modal.info({
      title: '导出库存报表',
      content: (
        <div>
          <p>导出功能正在开发中...</p>
          <p>将支持导出为 Excel 格式，包含：</p>
          <ul>
            <li>商品基本信息</li>
            <li>当前库存状态</li>
            <li>库存价值分析</li>
            <li>补货建议</li>
          </ul>
        </div>
      ),
      onOk() {},
    });
    
    // 或者如果你想要一个简单的实现，可以导出当前显示的数据
    // const dataToExport = filteredProducts.map(product => ({
    //   '商品名称': product.name,
    //   '条形码': product.barcode || '-',
    //   '分类': product.category?.name || '-',
    //   '当前库存': product.stock,
    //   '单位': product.unit,
    //   '最低库存': product.minStock,
    //   '最高库存': product.maxStock,
    //   '售价': product.price,
    //   '库存价值': (product.stock * product.price).toFixed(2),
    //   '状态': product.stock === 0 ? '缺货' : 
    //           product.stock <= product.minStock ? '库存不足' : 
    //           product.stock >= product.maxStock ? '库存充足' : '正常'
    // }));
    
    // console.log('导出数据:', dataToExport);
    // message.info('导出功能开发中...');
  };

  // 单个商品库存调整
  const handleStockAdjust = (product) => {
    setCurrentProduct(product);
    setStockModalVisible(true);
    stockForm.resetFields();
  };

  // 提交库存调整
  const handleSubmitStockAdjust = async (values) => {
    try {
      const res = await adjustStock(currentProduct.id, values);
      if (res.success) {
        message.success('库存调整成功');
        setStockModalVisible(false);
        fetchInventoryData();
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 打开批量补货弹窗
  const handleBatchReplenish = async () => {
    setBatchModalVisible(true);
    setBatchLoading(true);
    
    try {
      // 判断是否有选中的商品
      if (selectedProducts && selectedProducts.length > 0) {
        // 如果有选中的商品，直接使用选中的商品
        const list = selectedProducts.map(product => ({
          ...product,
          replenishQuantity: getSuggestedQuantity(product), // 使用建议补货量函数
          selected: true,
          urgencyLevel: product.stock === 0 ? 'critical' : 
                      product.stock <= product.minStock ? 'warning' : 'normal'
        }));
        
        setReplenishList(list);
        
        // 计算汇总
        const totalQuantity = list.reduce((sum, item) => sum + item.replenishQuantity, 0);
        const totalCost = list.reduce((sum, item) => sum + (item.replenishQuantity * (item.cost || 0)), 0);
        
        setReplenishSummary({
          totalProducts: list.length,
          criticalCount: list.filter(p => p.urgencyLevel === 'critical').length,
          warningCount: list.filter(p => p.urgencyLevel === 'warning').length,
          totalQuantity,
          totalCost
        });
      } else {
        // 如果没有选中商品，获取所有补货建议
        const res = await getReplenishSuggestions();
        if (res.success) {
          const { suggestions, summary } = res.data;
          
          const list = suggestions.map(product => ({
            ...product,
            replenishQuantity: product.suggestedQuantity,
            selected: true
          }));
          
          setReplenishList(list);
          setReplenishSummary(summary);
        }
      }
    } catch (error) {
      message.error('获取补货信息失败');
    } finally {
      setBatchLoading(false);
    }
  };

  // 更新补货数量
  const handleQuantityChange = (productId, quantity) => {
    const newList = replenishList.map(item => {
      if (item.id === productId) {
        return {
          ...item,
          replenishQuantity: quantity,
          estimatedCost: quantity * (item.cost || 0)
        };
      }
      return item;
    });
    
    setReplenishList(newList);
    
    // 重新计算汇总
    const selected = newList.filter(item => item.selected);
    const totalQuantity = selected.reduce((sum, item) => sum + (item.replenishQuantity || 0), 0);
    const totalCost = selected.reduce((sum, item) => sum + (item.replenishQuantity * (item.cost || 0)), 0);
    
    setReplenishSummary(prev => ({
      ...prev,
      totalQuantity,
      totalCost
    }));
  };

  // 切换选择状态
  const handleSelectChange = (productId, checked) => {
    const newList = replenishList.map(item => {
      if (item.id === productId) {
        return { ...item, selected: checked };
      }
      return item;
    });
    
    setReplenishList(newList);
    
    // 重新计算汇总
    const selected = newList.filter(item => item.selected);
    const totalQuantity = selected.reduce((sum, item) => sum + (item.replenishQuantity || 0), 0);
    const totalCost = selected.reduce((sum, item) => sum + (item.replenishQuantity * (item.cost || 0)), 0);
    
    setReplenishSummary(prev => ({
      ...prev,
      totalQuantity,
      totalCost
    }));
  };

  // 提交批量补货
  const handleSubmitBatchReplenish = async (values) => {
    const selectedProducts = replenishList.filter(item => item.selected && item.replenishQuantity > 0);
    
    if (selectedProducts.length === 0) {
      message.warning('请选择至少一个商品并设置补货数量');
      return;
    }
    
    Modal.confirm({
      title: '确认批量补货',
      content: (
        <div>
          <p>即将为 <strong>{selectedProducts.length}</strong> 个商品补货</p>
          <p>补货总量：<strong>{replenishSummary.totalQuantity}</strong> 件</p>
          <p>预计成本：<strong>¥{replenishSummary.totalCost.toFixed(2)}</strong></p>
          <Divider />
          <Alert
            message="注意：此操作将直接更新库存，请确认补货信息无误"
            type="warning"
            showIcon
          />
        </div>
      ),
      okText: '确认补货',
      cancelText: '取消',
      onOk: async () => {
        setBatchLoading(true);
        try {
          const products = selectedProducts.map(item => ({
            productId: item.id,
            quantity: item.replenishQuantity
          }));
          
          const res = await batchReplenish({
            products,
            remark: values.remark
          });
          
          if (res.success) {
            const { successful, failed, summary } = res.data;
            
            // 显示结果
            Modal.success({
              title: '批量补货完成',
              width: 600,
              content: (
                <div>
                  <Result
                    status={failed.length === 0 ? 'success' : 'warning'}
                    title={`成功补货 ${successful.length} 个商品`}
                    subTitle={failed.length > 0 ? `${failed.length} 个商品补货失败` : '所有商品补货成功'}
                  />
                  
                  {successful.length > 0 && (
                    <>
                      <Divider>成功列表</Divider>
                      <div style={{ maxHeight: 200, overflow: 'auto' }}>
                        {successful.map(item => (
                          <div key={item.productId} style={{ marginBottom: 8 }}>
                            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                            <Text>{item.productName}：{item.beforeStock} → {item.afterStock}</Text>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {failed.length > 0 && (
                    <>
                      <Divider>失败列表</Divider>
                      <div style={{ maxHeight: 200, overflow: 'auto' }}>
                        {failed.map((item, index) => (
                          <div key={index} style={{ marginBottom: 8 }}>
                            <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                            <Text>商品ID {item.productId}：{item.error}</Text>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ),
              onOk: () => {
                setBatchModalVisible(false);
                fetchInventoryData(); // 刷新数据
              }
            });
          }
        } catch (error) {
          // 错误已在拦截器处理
        } finally {
          setBatchLoading(false);
        }
      }
    });
  };

  // 批量补货表格列
  const replenishColumns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.category?.name} | {record.barcode}
          </Text>
        </Space>
      )
    },
    {
      title: '当前库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      align: 'center',
      render: (stock, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: stock === 0 ? '#ff4d4f' : '#000' }}>
            {stock}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            / {record.minStock}
          </Text>
        </Space>
      )
    },
    {
      title: '建议补货',
      dataIndex: 'suggestedQuantity',
      key: 'suggestedQuantity',
      width: 100,
      align: 'center',
      render: (quantity) => (
        <Tag color="blue">{quantity}</Tag>
      )
    },
    {
      title: '补货数量',
      key: 'replenishQuantity',
      width: 150,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={9999}
          value={record.replenishQuantity}
          onChange={(value) => handleQuantityChange(record.id, value || 0)}
          disabled={!record.selected}
          addonAfter={record.unit}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '补货后库存',
      key: 'afterStock',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const afterStock = record.stock + (record.replenishQuantity || 0);
        const color = afterStock >= record.maxStock ? '#1890ff' : 
                      afterStock >= record.minStock ? '#52c41a' : '#faad14';
        return (
          <Text strong style={{ color }}>
            {afterStock}
          </Text>
        );
      }
    },
    {
      title: '成本',
      key: 'cost',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>¥{((record.replenishQuantity || 0) * (record.cost || 0)).toFixed(2)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            @{record.cost}/件
          </Text>
        </Space>
      )
    },
    {
      title: '选择',
      key: 'selected',
      width: 80,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <input
          type="checkbox"
          checked={record.selected}
          onChange={(e) => handleSelectChange(record.id, e.target.checked)}
        />
      )
    }
  ];

  // 获取库存状态标签
  const getStockStatusTag = (product) => {
    if (product.stock === 0) {
      return <Tag color="error">缺货</Tag>;
    } else if (product.stock <= product.minStock) {
      return <Tag color="warning">库存不足</Tag>;
    } else if (product.stock >= product.maxStock) {
      return <Tag color="processing">库存充足</Tag>;
    } else {
      return <Tag color="success">正常</Tag>;
    }
  };

  // 获取建议补货量
  const getSuggestedQuantity = (product) => {
    // 建议补货到最高库存的80%
    const target = Math.floor(product.maxStock * 0.8);
    return Math.max(0, target - product.stock);
  };

  // 表格列配置
  const columns = [
    {
      title: '商品信息',
      key: 'product',
      width: 250,
      fixed: 'left',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{record.name}</span>
          {record.barcode && (
            <span style={{ fontSize: 12, color: '#999' }}>
              条码：{record.barcode}
            </span>
          )}
          <Tag size="small">{record.category?.name}</Tag>
        </Space>
      )
    },
    {
      title: '当前库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.stock - b.stock,
      render: (stock, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ 
            fontSize: 16, 
            fontWeight: 'bold',
            color: stock === 0 ? '#ff4d4f' : 
                   stock <= record.minStock ? '#faad14' : 
                   '#000'
          }}>
            {stock}
          </span>
          <span style={{ fontSize: 12, color: '#999' }}>{record.unit}</span>
        </Space>
      )
    },
    {
      title: '库存范围',
      key: 'range',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontSize: 12 }}>
            最低：{record.minStock} {record.unit}
          </span>
          <Progress 
            percent={record.maxStock > 0 ? (record.stock / record.maxStock) * 100 : 0}
            size="small"
            showInfo={false}
            strokeColor={{
              '0%': '#ff4d4f',
              '30%': '#faad14',
              '60%': '#52c41a',
              '100%': '#1890ff'
            }}
          />
          <span style={{ fontSize: 12 }}>
            最高：{record.maxStock} {record.unit}
          </span>
        </Space>
      )
    },
    {
      title: '库存状态',
      key: 'status',
      width: 100,
      align: 'center',
      filters: [
        { text: '缺货', value: 'out' },
        { text: '库存不足', value: 'low' },
        { text: '正常', value: 'normal' },
        { text: '库存充足', value: 'high' }
      ],
      onFilter: (value, record) => {
        if (value === 'out') return record.stock === 0;
        if (value === 'low') return record.stock > 0 && record.stock <= record.minStock;
        if (value === 'normal') return record.stock > record.minStock && record.stock < record.maxStock;
        if (value === 'high') return record.stock >= record.maxStock;
        return false;
      },
      render: (_, record) => getStockStatusTag(record)
    },
    {
      title: '库存价值',
      key: 'value',
      width: 120,
      align: 'right',
      sorter: (a, b) => (a.stock * a.price) - (b.stock * b.price),
      render: (_, record) => (
        <span>¥{(record.stock * record.price).toFixed(2)}</span>
      )
    },
    {
      title: '建议操作',
      key: 'suggestion',
      width: 150,
      render: (_, record) => {
        if (record.stock === 0) {
          return (
            <Space direction="vertical" size={0}>
              <Tag color="red">立即补货</Tag>
              <span style={{ fontSize: 12 }}>
                建议补货：{getSuggestedQuantity(record)} {record.unit}
              </span>
            </Space>
          );
        } else if (record.stock <= record.minStock) {
          return (
            <Space direction="vertical" size={0}>
              <Tag color="orange">尽快补货</Tag>
              <span style={{ fontSize: 12 }}>
                建议补货：{getSuggestedQuantity(record)} {record.unit}
              </span>
            </Space>
          );
        } else if (record.stock >= record.maxStock) {
          return <Tag color="blue">暂停采购</Tag>;
        }
        return <Tag color="green">维持现状</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {isAdmin && (
            <Button
              type="link"
              size="small"
              icon={<InboxOutlined />}
              onClick={() => handleStockAdjust(record)}
            >
              调整库存
            </Button>
          )}
        </Space>
      )
    }
  ];

  // Tab 配置
  const tabItems = [
    {
      key: 'all',
      label: (
        <Space>
          <span>全部商品</span>
          <Badge count={stats.total} showZero style={{ backgroundColor: '#1890ff' }} />
        </Space>
      ),
    },
    {
      key: 'out',
      label: (
        <Space>
          <Badge status="error" />
          <span>缺货</span>
          <Badge count={stats.outOfStock} style={{ backgroundColor: '#ff4d4f' }} />
        </Space>
      ),
    },
    {
      key: 'low',
      label: (
        <Space>
          <Badge status="warning" />
          <span>库存不足</span>
          <Badge count={stats.lowStock} style={{ backgroundColor: '#faad14' }} />
        </Space>
      ),
    },
    {
      key: 'normal',
      label: (
        <Space>
          <Badge status="success" />
          <span>库存正常</span>
          <Badge count={stats.normalStock} style={{ backgroundColor: '#52c41a' }} />
        </Space>
      ),
    },
    {
      key: 'high',
      label: (
        <Space>
          <Badge status="processing" />
          <span>库存充足</span>
          <Badge count={stats.highStock} style={{ backgroundColor: '#1890ff' }} />
        </Space>
      ),
    }
  ];

  // 选择配置
  const rowSelection = isAdmin ? {
    selectedRowKeys: selectedProducts.map(p => p.id),
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedProducts(selectedRows);
    },
    getCheckboxProps: (record) => ({
      disabled: record.stock >= record.maxStock,
    }),
  } : null;

  return (
    <div className="inventory-management">
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="商品总数"
              value={stats.total}
              prefix={<ShoppingCartOutlined />}
              suffix="种"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="库存总价值"
              value={stats.totalValue}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="缺货商品"
              value={stats.outOfStock}
              valueStyle={{ color: '#ff4d4f' }}
              suffix={`/ ${stats.total ? Math.round(stats.outOfStock / stats.total * 100) : 0}%`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="需补货商品"
              value={stats.outOfStock + stats.lowStock}
              valueStyle={{ color: '#faad14' }}
              suffix={`/ ${stats.total ? Math.round((stats.outOfStock + stats.lowStock) / stats.total * 100) : 0}%`}
            />
          </Card>
        </Col>
      </Row>

      {/* 主体内容 */}
      <Card>
        {/* 操作栏 */}
        <div style={{ marginBottom: 16 }}>
          <Form
            form={searchForm}
            layout="inline"
            onFinish={handleSearch}
          >
            {/* ... 其他表单项 ... */}
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  查询
                </Button>
                <Button onClick={handleResetSearch}>
                  重置
                </Button>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={fetchInventoryData}
                >
                  刷新
                </Button>
                
                {/* 修改批量补货按钮的显示逻辑 */}
                {isAdmin && (
                  <>
                    {selectedProducts.length > 0 ? (
                      // 有选中商品时，显示选中数量
                      <Button
                        type="primary"
                        icon={<ShoppingCartOutlined />}
                        onClick={handleBatchReplenish}
                      >
                        补货选中商品 ({selectedProducts.length})
                      </Button>
                    ) : (
                      // 没有选中商品时，显示智能补货建议
                      <Tooltip title="获取所有需要补货商品的智能建议">
                        <Button
                          icon={<ShoppingCartOutlined />}
                          onClick={handleBatchReplenish}
                        >
                          智能补货建议
                        </Button>
                      </Tooltip>
                    )}
                  </>
                )}
                
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                >
                  导出报表
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>

        {/* 预警提示 */}
        {(stats.outOfStock > 0 || stats.lowStock > 0) && (
          <Alert
            message={
              <Space>
                <ExclamationCircleOutlined />
                <span>
                  库存预警：当前有 {stats.outOfStock} 个商品缺货，
                  {stats.lowStock} 个商品库存不足，请及时补货！
                </span>
              </Space>
            }
            type="warning"
            showIcon={false}
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Tab 切换 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        {/* 商品表格 */}
        <Table
          loading={loading}
          columns={columns}
          dataSource={filteredProducts}
          rowKey="id"
          rowSelection={rowSelection}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            defaultPageSize: 20
          }}
          scroll={{ x: 1200 }}
          rowClassName={(record) => {
            if (record.stock === 0) return 'stock-out-row';
            if (record.stock <= record.minStock) return 'stock-low-row';
            return '';
          }}
        />
      </Card>

      {/* 库存调整弹窗 */}
      <Modal
        title={`调整库存 - ${currentProduct?.name}`}
        open={stockModalVisible}
        onCancel={() => {
          setStockModalVisible(false);
          stockForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Tag color="blue">当前库存：{currentProduct?.stock} {currentProduct?.unit}</Tag>
            <Tag color="green">最低库存：{currentProduct?.minStock} {currentProduct?.unit}</Tag>
            <Tag color="orange">最高库存：{currentProduct?.maxStock} {currentProduct?.unit}</Tag>
          </Space>
        </div>
        
        <Form
          form={stockForm}
          layout="vertical"
          onFinish={handleSubmitStockAdjust}
        >
          <Form.Item
            name="type"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="请选择操作类型">
              <Option value="purchase">
                <Space>
                  <Badge status="success" />
                  <span>采购入库</span>
                </Space>
              </Option>
              <Option value="adjust">
                <Space>
                  <Badge status="processing" />
                  <span>库存调整</span>
                </Space>
              </Option>
              <Option value="loss">
                <Space>
                  <Badge status="error" />
                  <span>报损出库</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="quantity"
            label="调整数量"
            rules={[
              { required: true, message: '请输入调整数量' },
              { type: 'number', min: 1, message: '数量必须大于0' }
            ]}
          >
            <InputNumber
              min={1}
              placeholder="请输入数量"
              style={{ width: '100%' }}
              addonAfter={currentProduct?.unit}
            />
          </Form.Item>
          
          <Form.Item
            name="remark"
            label="备注"
            rules={[
              { max: 200, message: '备注最多200个字符' }
            ]}
          >
            <TextArea
              placeholder="请输入备注信息"
              rows={3}
            />
          </Form.Item>
          
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setStockModalVisible(false);
                stockForm.resetFields();
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

      {/* 批量补货弹窗 */}
      <Modal
        title={
          <Space>
            <ShoppingCartOutlined />
            <span>批量补货</span>
            {selectedProducts.length > 0 ? (
              <Tag color="blue">已选 {selectedProducts.length} 个商品</Tag>
            ) : (
              <Tag color="green">智能补货建议</Tag>
            )}
          </Space>
        }
        open={batchModalVisible}
        onCancel={() => {
          setBatchModalVisible(false);
          setReplenishList([]);
          setSelectedProducts([]); // 清空选择
        }}
        footer={null}
        width={1200}
        styles={{
          body: { padding: '12px 24px' }
        }}
      >
        {batchLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>正在获取补货建议...</div>
          </div>
        ) : (
          <>
            {/* 汇总信息 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="需补货商品"
                    value={replenishList.length}
                    suffix="个"
                    prefix={<InboxOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="已选择"
                    value={replenishList.filter(item => item.selected).length}
                    suffix={`/ ${replenishList.length}`}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="补货总量"
                    value={replenishSummary.totalQuantity}
                    suffix="件"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="预计成本"
                    value={replenishSummary.totalCost}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 操作按钮 */}
            <Space style={{ marginBottom: 16 }}>
              <Button
                size="small"
                onClick={() => {
                  const newList = replenishList.map(item => ({ ...item, selected: true }));
                  setReplenishList(newList);
                }}
              >
                全选
              </Button>
              <Button
                size="small"
                onClick={() => {
                  const newList = replenishList.map(item => ({ ...item, selected: false }));
                  setReplenishList(newList);
                }}
              >
                全不选
              </Button>
              <Button
                size="small"
                onClick={() => {
                  const newList = replenishList.map(item => ({
                    ...item,
                    replenishQuantity: item.suggestedQuantity
                  }));
                  setReplenishList(newList);
                  message.success('已重置为建议数量');
                }}
              >
                重置为建议数量
              </Button>
              <Button
                size="small"
                onClick={() => {
                  const newList = replenishList.map(item => ({
                    ...item,
                    replenishQuantity: item.urgencyLevel === 'critical' ? item.suggestedQuantity : 0,
                    selected: item.urgencyLevel === 'critical'
                  }));
                  setReplenishList(newList);
                  message.info('仅选择缺货商品');
                }}
                danger
              >
                仅补缺货商品
              </Button>
            </Space>

            {/* 商品列表 */}
            <Table
              columns={replenishColumns}
              dataSource={replenishList}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ y: 300, x: 1000 }}
              rowClassName={(record) => {
                if (record.stock === 0) return 'urgent-row';
                if (record.stock <= record.minStock) return 'warning-row';
                return '';
              }}
            />

            {/* 备注表单 */}
            <Form
              layout="vertical"
              onFinish={handleSubmitBatchReplenish}
              style={{ marginTop: 16 }}
            >
              <Form.Item
                name="remark"
                label="补货备注"
              >
                <TextArea
                  placeholder="请输入补货备注，如：供应商信息、采购单号等"
                  rows={3}
                />
              </Form.Item>
              
              <Form.Item>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Alert
                    message="提示：补货后会自动生成库存记录，请仔细核对补货数量"
                    type="info"
                    showIcon
                  />
                  <Space>
                    <Button onClick={() => {
                      setBatchModalVisible(false);
                      setReplenishList([]);
                    }}>
                      取消
                    </Button>
                    <Button 
                      type="primary" 
                      htmlType="submit"
                      loading={batchLoading}
                      disabled={replenishList.filter(item => item.selected).length === 0}
                    >
                      确认补货
                    </Button>
                  </Space>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default InventoryManagement;