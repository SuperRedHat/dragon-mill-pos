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
  InputNumber,
  Select,
  App,
  Row,
  Col,
  Statistic,
  Badge,
  Popconfirm,
  Drawer,
  Timeline,
  Empty
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  InboxOutlined,
  WarningOutlined,
  DollarOutlined
} from '@ant-design/icons';
import {
  getMaterialList,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  adjustMaterialStock
} from '@/api/materials';
import './index.scss';

const { Option } = Select;

const Materials = () => {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState({});
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockDrawerVisible, setStockDrawerVisible] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [stockRecords, setStockRecords] = useState([]);
  
  const [form] = Form.useForm();
  const [stockForm] = Form.useForm();
  const [searchForm] = Form.useForm();
  const { message, modal } = App.useApp();
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin';

  // 材料分类
  const materialCategories = [
    '谷物', '豆类', '坚果', '种子', '药材', '调味', '其他'
  ];

  // 获取材料列表
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await getMaterialList({
        page: currentPage,
        pageSize,
        ...searchParams
      });
      if (res.success) {
        setMaterials(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      message.error('获取材料列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
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

  // 打开新建/编辑弹窗
  const handleOpenModal = (material = null) => {
    setEditingMaterial(material);
    setModalVisible(true);
    
    if (material) {
      form.setFieldsValue({
        name: material.name,
        category: material.category,
        unit: material.unit,
        price: material.price,
        minStock: material.minStock,
        supplier: material.supplier,
        status: material.status
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        unit: '斤',
        minStock: 10,
        status: 'active'
      });
    }
  };

  // 提交材料信息
  const handleSubmit = async (values) => {
    try {
      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, values);
        message.success('材料更新成功');
      } else {
        // 新建时添加初始库存
        await createMaterial({
          ...values,
          stock: values.initialStock || 0
        });
        message.success('材料创建成功');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchMaterials();
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 删除材料
  const handleDelete = async (id) => {
    try {
      await deleteMaterial(id);
      message.success('材料删除成功');
      fetchMaterials();
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 打开库存调整弹窗
  const handleOpenStockModal = (material) => {
    setCurrentMaterial(material);
    setStockModalVisible(true);
    stockForm.resetFields();
  };

  // 提交库存调整
  const handleStockAdjust = async (values) => {
    try {
      await adjustMaterialStock(currentMaterial.id, values);
      message.success('库存调整成功');
      setStockModalVisible(false);
      fetchMaterials();
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 查看库存记录
  const handleViewStockRecords = (material) => {
    setCurrentMaterial(material);
    setStockDrawerVisible(true);
    // TODO: 获取库存记录
    setStockRecords([
      {
        id: 1,
        type: 'purchase',
        quantity: 100,
        beforeStock: 0,
        afterStock: 100,
        remark: '初始采购',
        createdAt: '2024-01-01 10:00:00',
        operatorName: '管理员'
      }
    ]);
  };

  // 获取库存状态
  const getStockStatus = (material) => {
    if (material.stock === 0) {
      return { color: 'error', text: '缺货' };
    } else if (material.stock <= material.minStock) {
      return { color: 'warning', text: '库存不足' };
    } else {
      return { color: 'success', text: '正常' };
    }
  };

  // 计算统计数据
  const statistics = {
    total: materials.length,
    totalValue: materials.reduce((sum, m) => sum + (m.stock * m.price), 0),
    lowStock: materials.filter(m => m.stock <= m.minStock).length,
    outOfStock: materials.filter(m => m.stock === 0).length
  };

  // 表格列配置
  const columns = [
    {
      title: '材料名称',
      dataIndex: 'name',
      key: 'name',
      width: 120
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (category) => (
        <Tag>{category || '未分类'}</Tag>
      )
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
      align: 'center'
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      align: 'right',
      render: (price) => `¥${price.toFixed(2)}`
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 120,
      render: (stock, record) => {
        const status = getStockStatus(record);
        return (
          <Space>
            <span style={{ color: status.color === 'error' ? '#ff4d4f' : '#000' }}>
              {stock.toFixed(2)} {record.unit}
            </span>
            <Badge status={status.color} text={status.text} />
          </Space>
        );
      }
    },
    {
      title: '库存价值',
      key: 'stockValue',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <span style={{ color: '#52c41a' }}>
          ¥{(record.stock * record.price).toFixed(2)}
        </span>
      )
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 150,
      ellipsis: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '停用'}
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
                onClick={() => handleOpenModal(record)}
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
                title="确定要删除该材料吗？"
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
    <div className="materials-page">
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
              placeholder="搜索材料名称/供应商"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="category">
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: 120 }}
            >
              {materialCategories.map(cat => (
                <Option key={cat} value={cat}>{cat}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: 120 }}
            >
              <Option value="active">启用</Option>
              <Option value="inactive">停用</Option>
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
                  onClick={() => handleOpenModal()}
                >
                  新建材料
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="材料总数"
                value={statistics.total}
                suffix="种"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="库存总值"
                value={statistics.totalValue}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="库存不足"
                value={statistics.lowStock}
                suffix="种"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="缺货"
                value={statistics.outOfStock}
                suffix="种"
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 材料表格 */}
        <Table
          loading={loading}
          columns={columns}
          dataSource={materials}
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

      {/* 新建/编辑材料弹窗 */}
      <Modal
        title={editingMaterial ? '编辑材料' : '新建材料'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="材料名称"
                rules={[{ required: true, message: '请输入材料名称' }]}
              >
                <Input placeholder="请输入材料名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="材料分类"
                rules={[{ required: true, message: '请选择材料分类' }]}
              >
                <Select placeholder="请选择材料分类">
                  {materialCategories.map(cat => (
                    <Option key={cat} value={cat}>{cat}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="unit"
                label="计量单位"
                rules={[{ required: true, message: '请输入计量单位' }]}
              >
                <Input placeholder="如：斤、千克、包" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="price"
                label="单价"
                rules={[
                  { required: true, message: '请输入单价' },
                  { type: 'number', min: 0, message: '单价不能为负数' }
                ]}
              >
                <InputNumber
                  prefix="¥"
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="minStock"
                label="最低库存"
                rules={[
                  { type: 'number', min: 0, message: '最低库存不能为负数' }
                ]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="10.00"
                />
              </Form.Item>
            </Col>
          </Row>

          {!editingMaterial && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="initialStock"
                  label="初始库存"
                  rules={[
                    { type: 'number', min: 0, message: '库存不能为负数' }
                  ]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="0.00"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="状态"
                  rules={[{ required: true, message: '请选择状态' }]}
                >
                  <Select>
                    <Option value="active">启用</Option>
                    <Option value="inactive">停用</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            name="supplier"
            label="供应商"
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>

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

      {/* 库存调整弹窗 */}
      <Modal
        title={`库存调整 - ${currentMaterial?.name}`}
        open={stockModalVisible}
        onCancel={() => {
          setStockModalVisible(false);
          stockForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={stockForm}
          layout="vertical"
          onFinish={handleStockAdjust}
        >
          <div style={{ marginBottom: 16 }}>
            <Tag color="blue">
              当前库存：{currentMaterial?.stock} {currentMaterial?.unit}
            </Tag>
            <Tag color="orange">
              最低库存：{currentMaterial?.minStock} {currentMaterial?.unit}
            </Tag>
          </div>

          <Form.Item
            name="type"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="请选择操作类型">
              <Option value="purchase">采购入库</Option>
              <Option value="adjust">库存调整</Option>
              <Option value="loss">报损出库</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="quantity"
            label="数量"
            rules={[
              { required: true, message: '请输入数量' },
              { type: 'number', min: 0.01, message: '数量必须大于0' }
            ]}
          >
            <InputNumber
              min={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="请输入数量"
              addonAfter={currentMaterial?.unit}
            />
          </Form.Item>
          
          <Form.Item
            name="remark"
            label="备注"
            rules={[{ required: true, message: '请输入备注说明' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入备注说明"
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
                确认调整
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 库存记录抽屉 */}
      <Drawer
        title={`库存记录 - ${currentMaterial?.name}`}
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
                purchase: { text: '采购入库', color: 'green' },
                sale: { text: '销售出库', color: 'blue' },
                adjust: { text: '库存调整', color: 'orange' },
                loss: { text: '报损出库', color: 'red' }
              };
              const type = typeMap[record.type] || { text: record.type, color: 'gray' };
              
              return (
                <Timeline.Item
                  key={record.id}
                  label={record.createdAt}
                  color={type.color}
                >
                  <p><strong>{type.text}</strong></p>
                  <p>数量：{record.quantity > 0 ? '+' : ''}{record.quantity}</p>
                  <p>库存：{record.beforeStock} → {record.afterStock}</p>
                  {record.remark && <p>备注：{record.remark}</p>}
                  <p style={{ fontSize: 12, color: '#999' }}>
                    操作人：{record.operatorName}
                  </p>
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

export default Materials;