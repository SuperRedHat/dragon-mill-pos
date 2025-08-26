import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Alert,
  Empty,
  Input,
  InputNumber,
  Select,
  App,
  Popconfirm,
  Upload,
  Image,
  Row,
  Col,
  Badge,
  Tooltip,
  Drawer,
  Descriptions,
  Timeline
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UploadOutlined,
  BarcodeOutlined,
  PictureOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
  InboxOutlined
} from '@ant-design/icons';
import {
  getProductList,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  adjustStock,
  getStockRecords
} from '@/api/products';
import { getCategoryList } from '@/api/productCategories';
import './index.scss';

const { Option } = Select;
const { TextArea } = Input;

const ProductList = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState({});
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [currentProduct, setCurrentProduct] = useState(null);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockDrawerVisible, setStockDrawerVisible] = useState(false);
  const [stockRecords, setStockRecords] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  
  const [form] = Form.useForm();
  const [stockForm] = Form.useForm();
  const [searchForm] = Form.useForm();
  const { message } = App.useApp();
  
  // 获取当前用户角色
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin';

  // 获取商品列表
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await getProductList({
        page: currentPage,
        pageSize,
        ...searchParams
      });
      if (res.success) {
        setProducts(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      setLoading(false);
    }
  };

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const res = await getCategoryList({ status: 'active' });
      if (res.success) {
        setCategories(res.data);
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, pageSize, searchParams]);

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

  // 打开模态框
  const handleOpenModal = (type, product = null) => {
    setModalType(type);
    setCurrentProduct(product);
    setModalVisible(true);
    setImageUrl(product?.image || '');
    
    if (type === 'edit' && product) {
      form.setFieldsValue({
        categoryId: product.categoryId,
        name: product.name,
        shortName: product.shortName,
        barcode: product.barcode,
        unit: product.unit,
        price: product.price,
        cost: product.cost,
        memberPrice: product.memberPrice,
        minStock: product.minStock,
        maxStock: product.maxStock,
        status: product.status
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        unit: '个',
        stock: 0,
        minStock: 0,
        maxStock: 1000
      });
    }
  };

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      if (modalType === 'create') {
        const res = await createProduct(values);
        if (res.success) {
          message.success('商品创建成功');
          setModalVisible(false);
          fetchProducts();
        }
      } else {
        const res = await updateProduct(currentProduct.id, values);
        if (res.success) {
          message.success('商品更新成功');
          setModalVisible(false);
          fetchProducts();
        }
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 删除商品
  const handleDelete = async (id) => {
    try {
      const res = await deleteProduct(id);
      if (res.success) {
        message.success('商品删除成功');
        fetchProducts();
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 上传图片
  const handleUploadImage = async (options) => {
    const { file, onSuccess, onError } = options;
    
    if (!currentProduct) {
      message.error('请先保存商品信息');
      return;
    }
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await uploadProductImage(currentProduct.id, formData);
      if (res.success) {
        message.success('图片上传成功');
        setImageUrl(res.data.image);
        onSuccess(res.data);
        fetchProducts();
      }
    } catch (error) {
      onError(error);
    }
  };

  // 打开库存调整弹窗
  const handleOpenStockModal = (product) => {
    setCurrentProduct(product);
    setStockModalVisible(true);
    stockForm.resetFields();
  };

  // 提交库存调整
  const handleStockAdjust = async (values) => {
    try {
      const res = await adjustStock(currentProduct.id, values);
      if (res.success) {
        message.success('库存调整成功');
        setStockModalVisible(false);
        fetchProducts();
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 查看库存记录
  const handleViewStockRecords = async (product) => {
    setCurrentProduct(product);
    setStockDrawerVisible(true);
    try {
      const res = await getStockRecords(product.id, { page: 1, pageSize: 50 });
      if (res.success) {
        setStockRecords(res.data.list);
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 获取库存状态
  const getStockStatus = (product) => {
    if (product.stock === 0) {
      return { color: 'error', text: '缺货' };
    } else if (product.stock <= product.minStock) {
      return { color: 'warning', text: '库存不足' };
    } else if (product.stock >= product.maxStock) {
      return { color: 'processing', text: '库存充足' };
    } else {
      return { color: 'success', text: '正常' };
    }
  };

  // 表格列配置
  const columns = [
    {
      title: '商品图片',
      dataIndex: 'image',
      key: 'image',
      width: 80,
      align: 'center',
      render: (image) => (
        image ? (
          <Image
            width={50}
            height={50}
            src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '')}${image}`}
            fallback="/placeholder.png"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div style={{ 
            width: 50, 
            height: 50, 
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <PictureOutlined style={{ fontSize: 20, color: '#999' }} />
          </div>
        )
      )
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text, record) => (
        <div>
          <div>{text}</div>
          {record.shortName && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.shortName}</div>
          )}
        </div>
      )
    },
    {
      title: '条形码',
      dataIndex: 'barcode',
      key: 'barcode',
      width: 120,
      render: (text) => text || '-'
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => category?.name || '-'
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
      align: 'center'
    },
    {
      title: '售价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      align: 'right',
      render: (price) => `¥${price.toFixed(2)}`
    },
    {
      title: '会员价',
      dataIndex: 'memberPrice',
      key: 'memberPrice',
      width: 100,
      align: 'right',
      render: (price) => price ? `¥${price.toFixed(2)}` : '-'
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 120,
      align: 'left',
      render: (stock, record) => {
        let status = '';
        let color = '';
        
        if (stock === 0) {
          status = '缺货';
          color = '#ff4d4f';
        } else if (stock <= record.minStock) {
          status = '不足';
          color = '#faad14';
        } else if (stock >= record.maxStock) {
          status = '充足';
          color = '#1890ff';
        } else {
          status = '正常';
          color = '#52c41a';
        }
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color, fontWeight: 500, minWidth: '30px' }}>
              {stock}
            </span>
            <Tag color={color} style={{ margin: 0, fontSize: '12px' }}>
              {status}
            </Tag>
          </div>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: (status) => (
        <Tag color={status === 'on_sale' ? 'green' : 'default'}>
          {status === 'on_sale' ? '在售' : '下架'}
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
          {isAdmin ? (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenModal('edit', record)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                icon={<InboxOutlined />}
                onClick={() => handleOpenStockModal(record)}
              >
                调整库存
              </Button>
              <Popconfirm
                title="确定要删除该商品吗？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            </>
          ) : (
            <Button
              type="link"
              size="small"
              onClick={() => handleViewStockRecords(record)}
            >
              库存记录
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="product-list">
      <Card>
        {/* 搜索栏 */}
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="keyword">
            <Input
              placeholder="搜索商品名称/条码"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="categoryId">
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: 150 }}
            >
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: 120 }}
            >
              <Option value="on_sale">在售</Option>
              <Option value="off_sale">下架</Option>
            </Select>
          </Form.Item>
          <Form.Item name="stockWarning">
            <Select
                placeholder="库存状态"
                allowClear
                style={{ width: 120 }}
            >
                <Option value="out">
                <Badge status="error" text="已缺货" />
                </Option>
                <Option value="low">
                <Badge status="warning" text="库存不足" />
                </Option>
                <Option value="normal">
                <Badge status="success" text="库存正常" />
                </Option>
                <Option value="high">
                <Badge status="processing" text="库存充足" />
                </Option>
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
              {isAdmin && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenModal('create')}
                >
                  新建商品
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>

        {/* 商品表格 */}
        <Table
          loading={loading}
          columns={columns}
          dataSource={products}
          rowKey="id"
          scroll={{ x: 1400 }}
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

      {/* 新建/编辑商品弹窗 */}
      <Modal
        title={modalType === 'create' ? '新建商品' : '编辑商品'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setImageUrl('');
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="categoryId"
                label="商品分类"
                rules={[{ required: true, message: '请选择商品分类' }]}
              >
                <Select placeholder="请选择商品分类">
                  {categories.map(cat => (
                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="barcode"
                label="条形码"
              >
                <Input
                  prefix={<BarcodeOutlined />}
                  placeholder="请输入条形码"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="商品名称"
                rules={[
                  { required: true, message: '请输入商品名称' },
                  { max: 100, message: '商品名称最多100个字符' }
                ]}
              >
                <Input placeholder="请输入商品名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="shortName"
                label="商品简称"
                rules={[
                  { max: 50, message: '商品简称最多50个字符' }
                ]}
              >
                <Input placeholder="请输入商品简称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="unit"
                label="单位"
                rules={[{ required: true, message: '请输入单位' }]}
              >
                <Input placeholder="如：个、斤、包" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="price"
                label="售价"
                rules={[
                  { required: true, message: '请输入售价' },
                  { type: 'number', min: 0, message: '售价不能为负数' }
                ]}
              >
                <InputNumber
                  prefix="¥"
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="cost"
                label="成本价"
                rules={[
                  { type: 'number', min: 0, message: '成本价不能为负数' }
                ]}
              >
                <InputNumber
                  prefix="¥"
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="memberPrice"
                label="会员价"
                rules={[
                  { type: 'number', min: 0, message: '会员价不能为负数' }
                ]}
              >
                <InputNumber
                  prefix="¥"
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {modalType === 'create' && (
              <Col span={6}>
                <Form.Item
                  name="stock"
                  label="初始库存"
                  rules={[
                    { type: 'number', min: 0, message: '库存不能为负数' }
                  ]}
                >
                  <InputNumber
                    min={0}
                    step={0.1}  // 添加步进值
                    precision={2}  // 保留2位小数
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            )}
            <Col span={6}>
              <Form.Item
                name="minStock"
                label="最低库存"
                rules={[
                  { type: 'number', min: 0, message: '最低库存不能为负数' }
                ]}
              >
                <InputNumber
                  min={0}
                  step={0.1}  // 添加步进值
                  precision={2}  // 保留2位小数
                  placeholder="0.00"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="maxStock"
                label="最高库存"
                rules={[
                  { type: 'number', min: 0, message: '最高库存不能为负数' }
                ]}
              >
                <InputNumber
                  min={0}
                  step={0.1}  // 添加步进值
                  precision={2}  // 保留2位小数
                  placeholder="1000.00"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            {modalType === 'edit' && (
              <Col span={6}>
                <Form.Item
                  name="status"
                  label="状态"
                  rules={[{ required: true, message: '请选择状态' }]}
                >
                  <Select>
                    <Option value="on_sale">在售</Option>
                    <Option value="off_sale">下架</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>

          {modalType === 'edit' && (
            <Form.Item label="商品图片">
              <Upload
                name="image"
                listType="picture-card"
                showUploadList={false}
                customRequest={handleUploadImage}
                accept="image/*"
              >
                {imageUrl ? (
                  <img 
                    src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '')}${imageUrl}`} 
                    alt="商品图片" 
                    style={{ width: '100%' }} 
                  />
                ) : (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传图片</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
          )}

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setImageUrl('');
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

      {/* 库存调整弹窗 */}
      <Modal
        title={`库存管理 - ${currentProduct?.name}`}
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
          onFinish={handleStockAdjust}
        >
          <Form.Item
            name="type"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select 
              placeholder="请选择操作类型"
              onChange={(value) => {
                // 根据类型设置不同的提示
                stockForm.setFieldsValue({ remark: '' });
              }}
            >
              <Option value="purchase">
                <Space>
                  <Badge status="success" />
                  <span>采购入库</span>
                  <span style={{ color: '#999', fontSize: 12 }}>（供应商进货）</span>
                </Space>
              </Option>
              <Option value="adjust">
                <Space>
                  <Badge status="processing" />
                  <span>库存调整</span>
                  <span style={{ color: '#999', fontSize: 12 }}>（盘点调整/纠错）</span>
                </Space>
              </Option>
              <Option value="loss">
                <Space>
                  <Badge status="error" />
                  <span>报损出库</span>
                  <span style={{ color: '#999', fontSize: 12 }}>（损坏/过期）</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>
          
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
            prevValues.type !== currentValues.type
          }>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return (
                <>
                  <Form.Item
                    name="quantity"
                    label={
                      <Space>
                        <span>
                          {type === 'purchase' ? '入库数量' : 
                          type === 'loss' ? '报损数量' : 
                          '调整数量'}
                        </span>
                        {type === 'adjust' && (
                          <Tag color="blue" style={{ fontSize: 12 }}>
                            正数增加，负数减少
                          </Tag>
                        )}
                      </Space>
                    }
                    rules={[
                      { required: true, message: '请输入数量' },
                      type === 'purchase' || type === 'loss' 
                        ? { type: 'number', min: 1, message: '数量必须大于0' }
                        : { type: 'number', min: -999999, message: '请输入有效数量' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value) return Promise.resolve();
                          const currentStock = currentProduct?.stock || 0;
                          const type = getFieldValue('type');
                          
                          // 库存调整时，检查是否会导致负库存
                          if (type === 'adjust' && value < 0) {
                            const newStock = currentStock + value;
                            if (newStock < 0) {
                              return Promise.reject(new Error(`调整后库存不能为负数（当前：${currentStock}）`));
                            }
                          }
                          
                          // 报损时，检查是否超过现有库存
                          if (type === 'loss' && value > currentStock) {
                            return Promise.reject(new Error(`报损数量不能超过当前库存（${currentStock}）`));
                          }
                          
                          return Promise.resolve();
                        },
                      }),
                    ]}
                    extra={
                      type === 'purchase' ? '请输入采购入库的数量' :
                      type === 'loss' ? '请输入需要报损的数量' :
                      type === 'adjust' ? '输入正数增加库存，负数减少库存' : ''
                    }
                  >
                    <InputNumber
                      min={type === 'adjust' ? -999999 : 1}
                      placeholder={
                        type === 'purchase' ? '请输入入库数量' :
                        type === 'loss' ? '请输入报损数量' :
                        '请输入调整数量（正负均可）'
                      }
                      style={{ width: '100%' }}
                      addonAfter={currentProduct?.unit}
                    />
                  </Form.Item>
                  
                  {/* 根据不同类型显示不同的备注模板 */}
                  <Form.Item
                    name="remark"
                    label="备注说明"
                    rules={[
                      type === 'adjust' 
                        ? { required: true, message: '库存调整必须填写原因' }
                        : { max: 200, message: '备注最多200个字符' }
                    ]}
                  >
                    <TextArea
                      placeholder={
                        type === 'purchase' ? '如：供应商名称、采购单号等' :
                        type === 'loss' ? '如：商品破损、过期、自然损耗等' :
                        type === 'adjust' ? '请说明调整原因（必填）：如盘点差异、系统错误修正等' : 
                        '请输入备注信息'
                      }
                      rows={3}
                    />
                  </Form.Item>
                  
                  {/* 显示预计结果 */}
                  {getFieldValue('quantity') && (
                    <Alert
                      message="操作预览"
                      description={
                        <Space direction="vertical">
                          <span>
                            当前库存：{currentProduct?.stock} {currentProduct?.unit}
                          </span>
                          <span>
                            {type === 'purchase' ? '增加' : 
                            type === 'loss' ? '减少' : 
                            getFieldValue('quantity') > 0 ? '增加' : '减少'}
                            数量：{Math.abs(getFieldValue('quantity'))} {currentProduct?.unit}
                          </span>
                          <span>
                            <strong>
                              操作后库存：
                              {type === 'purchase' 
                                ? currentProduct?.stock + Math.abs(getFieldValue('quantity'))
                                : type === 'loss'
                                ? currentProduct?.stock - Math.abs(getFieldValue('quantity'))
                                : currentProduct?.stock + getFieldValue('quantity')
                              } {currentProduct?.unit}
                            </strong>
                          </span>
                        </Space>
                      }
                      type={
                        type === 'purchase' ? 'success' :
                        type === 'loss' ? 'warning' :
                        'info'
                      }
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}
                </>
              );
            }}
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
                确认操作
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 库存记录抽屉 */}
      <Drawer
        title={`库存记录 - ${currentProduct?.name}`}
        placement="right"
        width={600}
        open={stockDrawerVisible}
        onClose={() => {
          setStockDrawerVisible(false);
          setStockRecords([]);
        }}
      >
        {stockRecords.length > 0 ? (
          <Timeline mode="left">
            {stockRecords.map((record) => {
              const typeMap = {
                purchase: { 
                  text: '采购入库', 
                  color: 'green',
                  icon: '📦',
                  desc: '供应商进货'
                },
                sale: { 
                  text: '销售出库', 
                  color: 'blue',
                  icon: '🛒',
                  desc: '客户购买'
                },
                adjust: { 
                  text: '库存调整', 
                  color: record.quantity > 0 ? 'orange' : 'gray',
                  icon: '🔧',
                  desc: record.quantity > 0 ? '盘盈调整' : '盘亏调整'
                },
                loss: { 
                  text: '报损出库', 
                  color: 'red',
                  icon: '❌',
                  desc: '商品报损'
                }
              };
              const type = typeMap[record.type] || { 
                text: record.type, 
                color: 'gray',
                icon: '📋',
                desc: ''
              };
              
              return (
                <Timeline.Item
                  key={record.id}
                  label={new Date(record.createdAt).toLocaleString()}
                  color={type.color}
                >
                  <Space direction="vertical" size={0}>
                    <Space>
                      <span style={{ fontSize: 16 }}>{type.icon}</span>
                      <strong>{type.text}</strong>
                      {type.desc && <Tag size="small">{type.desc}</Tag>}
                    </Space>
                    <div>
                      数量变化：
                      <span style={{ 
                        color: record.quantity > 0 ? '#52c41a' : '#ff4d4f',
                        fontWeight: 'bold'
                      }}>
                        {record.quantity > 0 ? '+' : ''}{record.quantity} {currentProduct?.unit}
                      </span>
                    </div>
                    <div>
                      库存变化：{record.beforeStock} → 
                      <span style={{ fontWeight: 'bold' }}>
                        {record.afterStock}
                      </span>
                    </div>
                    {record.remark && (
                      <div style={{ 
                        background: '#f5f5f5', 
                        padding: '4px 8px', 
                        borderRadius: 4,
                        marginTop: 4
                      }}>
                        备注：{record.remark}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                      操作人：{record.operatorName}
                    </div>
                  </Space>
                </Timeline.Item>
              );
            })}
          </Timeline>
        ) : (
          <Empty description="暂无库存记录" />
        )}
      </Drawer>
    </div>
  );
};

export default ProductList;