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
  Popconfirm,
  Badge
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import {
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory
} from '@/api/productCategories';
import './index.scss';

const { Option } = Select;
const { TextArea } = Input;

const ProductCategories = () => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [currentCategory, setCurrentCategory] = useState(null);
  
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  
  // 获取当前用户角色
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin';

  // 获取分类列表
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await getCategoryList();
      if (res.success) {
        setCategories(res.data);
      }
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 打开模态框
  const handleOpenModal = (type, category = null) => {
    setModalType(type);
    setCurrentCategory(category);
    setModalVisible(true);
    
    if (type === 'edit' && category) {
      form.setFieldsValue({
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        status: category.status
      });
    } else {
      form.resetFields();
    }
  };

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      if (modalType === 'create') {
        const res = await createCategory(values);
        if (res.success) {
          message.success('分类创建成功');
          setModalVisible(false);
          fetchCategories();
        }
      } else {
        const res = await updateCategory(currentCategory.id, values);
        if (res.success) {
          message.success('分类更新成功');
          setModalVisible(false);
          fetchCategories();
        }
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 删除分类
  const handleDelete = async (id) => {
    try {
      const res = await deleteCategory(id);
      if (res.success) {
        message.success('分类删除成功');
        fetchCategories();
      }
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 表格列配置
  const columns = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      align: 'center'
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          {record.productCount > 0 && (
            <Badge count={record.productCount} style={{ backgroundColor: '#52c41a' }} />
          )}
        </Space>
      )
    },
    {
      title: '分类描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-'
    },
    {
      title: '商品数量',
      dataIndex: 'productCount',
      key: 'productCount',
      width: 100,
      align: 'center',
      render: (count) => count || 0
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => new Date(text).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
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
              {record.productCount === 0 ? (
                <Popconfirm
                  title="确定要删除该分类吗？"
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
              ) : (
                <Button
                  type="link"
                  size="small"
                  danger
                  disabled
                  icon={<ExclamationCircleOutlined />}
                  title="该分类下有商品，无法删除"
                >
                  删除
                </Button>
              )}
            </>
          ) : (
            <span style={{ color: '#999' }}>-</span>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="product-categories">
      <Card
        title="商品分类管理"
        extra={
          isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal('create')}
            >
              新建分类
            </Button>
          )
        }
      >
        <Table
          loading={loading}
          columns={columns}
          dataSource={categories}
          rowKey="id"
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* 新建/编辑分类弹窗 */}
      <Modal
        title={modalType === 'create' ? '新建分类' : '编辑分类'}
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
          <Form.Item
            name="name"
            label="分类名称"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 50, message: '分类名称最多50个字符' }
            ]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="分类描述"
            rules={[
              { max: 200, message: '分类描述最多200个字符' }
            ]}
          >
            <TextArea
              placeholder="请输入分类描述"
              rows={3}
            />
          </Form.Item>
          
          <Form.Item
            name="sortOrder"
            label="排序顺序"
            initialValue={0}
            rules={[
              { type: 'number', min: 0, message: '排序值不能为负数' }
            ]}
          >
            <InputNumber
              min={0}
              placeholder="数值越小越靠前"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          {modalType === 'edit' && (
            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select>
                <Option value="active">启用</Option>
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
    </div>
  );
};

export default ProductCategories;