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
  Tabs,
  Row,
  Col,
  Avatar,
  List,
  Empty,
  Popconfirm,
  Drawer,
  Descriptions,
  Progress,
  Divider,
  AutoComplete,
  message as antMessage
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CalculatorOutlined,
  UserOutlined,
  GlobalOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import {
  getRecipeList,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  copyRecipe,
  calculateRecipePrice
} from '@/api/recipes';
import { getProductList } from '@/api/products';
import './index.scss';

const { Option } = Select;
const { TextArea } = Input;

const RecipeList = () => {
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('public');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [calculateModalVisible, setCalculateModalVisible] = useState(false);
  const [calculationResult, setCalculationResult] = useState(null);
  
  const [form] = Form.useForm();
  const [calculateForm] = Form.useForm();
  const { message, modal } = App.useApp();
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // 获取配方列表
  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await getRecipeList({
        type: activeTab === 'all' ? '' : activeTab
      });
      if (res.success) {
        setRecipes(res.data.list);
      }
    } catch (error) {
      message.error('获取配方列表失败');
    } finally {
      setLoading(false);
    }
  };



 // 获取商品列表（用作配方材料）
const fetchProducts = async () => {
  try {
    const res = await getProductList({
      page: 1,
      pageSize: 100,
      status: 'on_sale'
    });
    console.log('获取商品列表响应:', res);  // 添加日志
    if (res.success) {
      setProducts(res.data.list);
    }else {
      // 如果 success 为 false，显示具体错误
      message.error(res.error || '获取商品列表失败');
    }
  } catch (error) {
    console.error('获取商品列表错误:', error);
    message.error('获取商品列表失败');
  }
};

  useEffect(() => {
    fetchRecipes();
  }, [activeTab]);

  useEffect(() => {
    fetchProducts();
  }, []);

  // 打开新建/编辑弹窗
  const handleOpenModal = (recipe = null) => {
    setEditingRecipe(recipe);
    setModalVisible(true);
    
    if (recipe) {
      const materialsData = recipe.products?.map(m => ({
        productId: m.id,
        percentage: m.RecipeProduct?.percentage || 0
      })) || [];
      
      form.setFieldsValue({
        name: recipe.name,
        type: recipe.type,
        description: recipe.description,
        totalWeight: recipe.totalWeight,
        processingFee: recipe.processingFee,
        suitableFor: recipe.suitableFor,
        materials: materialsData
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        type: 'public',
        totalWeight: 100,
        processingFee: 5.00,
        materials: [{ materialId: undefined, percentage: 100 }]
      });
    }
  };

  // 提交配方
  const handleSubmit = async (values) => {
    // 验证配比总和
    const totalPercentage = values.materials.reduce((sum, m) => 
      sum + parseFloat(m.percentage || 0), 0
    );
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      message.error('材料配比总和必须为100%');
      return;
    }
    
    try {
      if (editingRecipe) {
        await updateRecipe(editingRecipe.id, values);
        message.success('配方更新成功');
      } else {
        await createRecipe(values);
        message.success('配方创建成功');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchRecipes();
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 删除配方
  const handleDelete = async (id) => {
    try {
      await deleteRecipe(id);
      message.success('配方删除成功');
      fetchRecipes();
    } catch (error) {
      // 错误已在拦截器处理
    }
  };

  // 复制配方
  const handleCopy = (recipe) => {
    modal.confirm({
      title: '复制配方',
      content: (
        <div>
          <p>复制配方：{recipe.name}</p>
          <Input 
            placeholder="请输入新配方名称" 
            defaultValue={`${recipe.name} - 副本`}
            id="copy-recipe-name"
          />
        </div>
      ),
      onOk: async () => {
        const name = document.getElementById('copy-recipe-name').value;
        if (!name) {
          message.error('请输入配方名称');
          return;
        }
        
        try {
          await copyRecipe(recipe.id, { name, type: 'private' });
          message.success('配方复制成功');
          fetchRecipes();
        } catch (error) {
          // 错误已在拦截器处理
        }
      }
    });
  };

  // 查看配方详情
  const handleViewDetail = (recipe) => {
    setCurrentRecipe(recipe);
    setDetailDrawerVisible(true);
  };

  // 计算配方价格
  const handleCalculate = async (recipe) => {
    setCurrentRecipe(recipe);
    setCalculateModalVisible(true);
    calculateForm.setFieldsValue({ weight: 100 });
  };

  const handleCalculateSubmit = async (values) => {
    try {
      const res = await calculateRecipePrice(currentRecipe.id, values.weight);
      if (res.success) {
        setCalculationResult(res.data);
      }
    } catch (error) {
      message.error('计算失败');
    }
  };

  // 渲染配方卡片
  const renderRecipeCard = (recipe) => (
    <Card
      key={recipe.id}
      hoverable
      className="recipe-card"
      actions={[
        <Button
          type="text"
          icon={<CalculatorOutlined />}
          onClick={() => handleCalculate(recipe)}
        >
          计算
        </Button>,
        <Button
          type="text"
          icon={<CopyOutlined />}
          onClick={() => handleCopy(recipe)}
        >
          复制
        </Button>,
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => handleOpenModal(recipe)}
        >
          编辑
        </Button>
      ]}
      onClick={() => handleViewDetail(recipe)}
    >
      <Card.Meta
        avatar={
          <Avatar
            icon={<ExperimentOutlined />}
            style={{ backgroundColor: recipe.type === 'public' ? '#1890ff' : '#52c41a' }}
          />
        }
        title={
          <Space>
            {recipe.name}
            <Tag color={recipe.type === 'public' ? 'blue' : 'green'} style={{ marginLeft: 8 }}>
              {recipe.type === 'public' ? '公共' : recipe.type === 'private' ? '私人' : '模板'}
            </Tag>
          </Space>
        }
        description={
          <div>
            <div className="recipe-description">
              {recipe.description || '暂无描述'}
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div className="recipe-materials">
              {recipe.materials?.slice(0, 3).map(m => (
                <Tag key={m.id} color="orange">
                  {m.name} {m.RecipeMaterial?.percentage}%
                </Tag>
              ))}
              {recipe.materials?.length > 3 && (
                <Tag>+{recipe.materials.length - 3}种</Tag>
              )}
            </div>
            <div className="recipe-meta">
              <Space size="large">
                <span>重量：{recipe.totalWeight}g</span>
                <span>加工费：¥{recipe.processingFee}</span>
                <span>使用：{recipe.usageCount}次</span>
              </Space>
            </div>
          </div>
        }
      />
    </Card>
  );

  return (
    <div className="recipe-list-page">
      <Card>
        <div className="page-header">
          <h2>配方管理</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            创建配方
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'public',
              label: (
                <span>
                  <GlobalOutlined /> 公共配方
                </span>
              )
            },
            {
              key: 'private',
              label: (
                <span>
                  <UserOutlined /> 私人配方
                </span>
              )
            },
            {
              key: 'template',
              label: (
                <span>
                  <FileTextOutlined /> 配方模板
                </span>
              )
            },
            {
              key: 'all',
              label: '全部配方'
            }
          ]}
        />

        {/* 配方列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            加载中...
          </div>
        ) : recipes.length > 0 ? (
          <Row gutter={[16, 16]}>
            {recipes.map(recipe => (
              <Col key={recipe.id} xs={24} sm={12} lg={8} xl={6}>
                {renderRecipeCard(recipe)}
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="暂无配方" />
        )}
      </Card>

      {/* 新建/编辑配方弹窗 */}
      <Modal
        title={editingRecipe ? '编辑配方' : '创建配方'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
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
            <Col span={16}>
              <Form.Item
                name="name"
                label="配方名称"
                rules={[{ required: true, message: '请输入配方名称' }]}
              >
                <Input placeholder="请输入配方名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="type"
                label="配方类型"
                rules={[{ required: true, message: '请选择配方类型' }]}
              >
                <Select>
                  <Option value="public">公共配方</Option>
                  <Option value="private">私人配方</Option>
                  <Option value="template">配方模板</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="配方说明"
          >
            <TextArea rows={3} placeholder="请输入配方说明" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="totalWeight"
                label="标准重量(克)"
                rules={[
                  { required: true, message: '请输入标准重量' },
                  { type: 'number', min: 1, message: '重量必须大于0' }
                ]}
              >
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  placeholder="100"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="processingFee"
                label="加工费(元)"
                rules={[
                  { required: true, message: '请输入加工费' },
                  { type: 'number', min: 0, message: '加工费不能为负' }
                ]}
              >
                <InputNumber
                  prefix="¥"
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="5.00"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="suitableFor"
                label="适用人群"
              >
                <Input placeholder="如：老人、儿童、孕妇等" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>材料配比</Divider>

          <Form.List name="materials">
            {(fields, { add, remove }) => {
              // 计算当前配比总和
              const currentTotal = form.getFieldValue('materials')?.reduce(
                (sum, m) => sum + parseFloat(m?.percentage || 0), 0
              ) || 0;

              return (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Progress
                      percent={currentTotal}
                      status={Math.abs(currentTotal - 100) < 0.01 ? 'success' : 'exception'}
                      format={percent => `${percent.toFixed(2)}%`}
                    />
                  </div>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space
                      key={key}
                      style={{ display: 'flex', marginBottom: 8 }}
                      align="baseline"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'productId']}
                        rules={[{ required: true, message: '请选择商品' }]}
                      >
                        <Select
                          placeholder="选择商品"
                          style={{ width: 200 }}
                          showSearch
                          optionFilterProp="children"
                        >
                          {products.map(m => (
                            <Option key={m.id} value={m.id}>
                              {m.name} (¥{m.price}/{m.unit})
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'percentage']}
                        rules={[
                          { required: true, message: '请输入配比' },
                          { type: 'number', min: 0.1, max: 100, message: '配比范围0.1-100' }
                        ]}
                      >
                        <InputNumber
                          min={0.1}
                          max={100}
                          precision={2}
                          placeholder="配比"
                          addonAfter="%"
                        />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button
                          type="link"
                          danger
                          onClick={() => remove(name)}
                        >
                          删除
                        </Button>
                      )}
                    </Space>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      添加材料
                    </Button>
                  </Form.Item>
                </>
              );
            }}
          </Form.List>

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

      {/* 配方详情抽屉 */}
      <Drawer
        title="配方详情"
        placement="right"
        width={600}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        {currentRecipe && (
          <>
            <Descriptions column={1} bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="配方编号">
                {currentRecipe.recipeNo}
              </Descriptions.Item>
              <Descriptions.Item label="配方名称">
                {currentRecipe.name}
              </Descriptions.Item>
              <Descriptions.Item label="配方类型">
                <Tag color={currentRecipe.type === 'public' ? 'blue' : 'green'}>
                  {currentRecipe.type === 'public' ? '公共' : 
                   currentRecipe.type === 'private' ? '私人' : '模板'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="配方说明">
                {currentRecipe.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="标准重量">
                {currentRecipe.totalWeight} 克
              </Descriptions.Item>
              <Descriptions.Item label="加工费">
                ¥{currentRecipe.processingFee}
              </Descriptions.Item>
              <Descriptions.Item label="适用人群">
                {currentRecipe.suitableFor || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="使用次数">
                {currentRecipe.usageCount} 次
              </Descriptions.Item>
            </Descriptions>

            <h4>材料配比</h4>
            <List
              dataSource={currentRecipe.materials}
              renderItem={material => (
                <List.Item>
                  <List.Item.Meta
                    title={material.name}
                    description={`${material.RecipeMaterial?.percentage}% - ${(currentRecipe.totalWeight * material.RecipeMaterial?.percentage / 100).toFixed(2)}克`}
                  />
                  <div>¥{material.price}/{material.unit}</div>
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>

      {/* 价格计算弹窗 */}
      <Modal
        title={`计算价格 - ${currentRecipe?.name}`}
        open={calculateModalVisible}
        onCancel={() => {
          setCalculateModalVisible(false);
          setCalculationResult(null);
          calculateForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={calculateForm}
          layout="vertical"
          onFinish={handleCalculateSubmit}
        >
          <Form.Item
            name="weight"
            label="制作重量(克)"
            rules={[
              { required: true, message: '请输入重量' },
              { type: 'number', min: 1, message: '重量必须大于0' }
            ]}
          >
            <InputNumber
              min={1}
              max={10000}
              style={{ width: '100%' }}
              placeholder="请输入制作重量"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              计算价格
            </Button>
          </Form.Item>
        </Form>

        {calculationResult && (
          <div className="calculation-result">
            <Divider />
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="制作重量">
                {calculationResult.weight} 克
              </Descriptions.Item>
              <Descriptions.Item label="材料成本">
                ¥{calculationResult.materialCost}
              </Descriptions.Item>
              <Descriptions.Item label="加工费">
                ¥{calculationResult.processingFee}
              </Descriptions.Item>
              <Descriptions.Item label="总价">
                <strong style={{ color: '#f5222d', fontSize: 18 }}>
                  ¥{calculationResult.totalPrice}
                </strong>
              </Descriptions.Item>
            </Descriptions>

            {calculationResult.materialDetails && (
              <>
                <Divider />
                <h4>材料明细</h4>
                <List
                  size="small"
                  dataSource={calculationResult.materialDetails}
                  renderItem={item => (
                    <List.Item>
                      <span>{item.name}</span>
                      <span>{item.weight.toFixed(2)}g</span>
                      <span>¥{item.price.toFixed(2)}</span>
                    </List.Item>
                  )}
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RecipeList;