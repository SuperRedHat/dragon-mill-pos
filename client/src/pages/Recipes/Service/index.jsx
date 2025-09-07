import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Steps,
  Button,
  Space,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Tag,
  Modal,
  Descriptions,
  Divider,
  App,
  Row,
  Col,
  Result,
  List,
  Avatar,
  AutoComplete,
  Spin,
  Alert
} from 'antd';
import {
  UserOutlined,
  ExperimentOutlined,
  CalculatorOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';
import { getRecipesForSale, calculateRecipePrice } from '@/api/recipes';
import { getMemberByPhone } from '@/api/members';
import './index.scss';

const { Step } = Steps;
const { Option } = Select;

const RecipeService = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [serviceWeight, setServiceWeight] = useState(100);
  const [priceInfo, setPriceInfo] = useState(null);
  const [serviceOrder, setServiceOrder] = useState(null);
  
  const [memberForm] = Form.useForm();
  const [recipeForm] = Form.useForm();
  const { message } = App.useApp();
  
  const printRef = useRef();

  // 获取配方列表
  const fetchRecipes = async (memberId) => {
    setLoading(true);
    try {
      const res = await getRecipesForSale(memberId);
      if (res.success) {
        setRecipes(res.data);
      }
    } catch (error) {
      message.error('获取配方列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  // 查找会员
  const handleSearchMember = async (values) => {
    try {
      const res = await getMemberByPhone(values.phone);
      if (res.success && res.data) {
        setSelectedMember(res.data);
        message.success(`会员识别成功：${res.data.name}`);
        // 重新加载配方（包含专属配方）
        fetchRecipes(res.data.id);
        setCurrentStep(1);
      } else {
        message.warning('未找到会员信息');
      }
    } catch (error) {
      message.error('查找会员失败');
    }
  };

  // 跳过会员，直接选择配方
  const handleSkipMember = () => {
    setSelectedMember(null);
    setCurrentStep(1);
  };

  // 选择配方
  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    recipeForm.setFieldsValue({
      recipeId: recipe.id,
      weight: 100
    });
  };

  // 计算价格
  const handleCalculatePrice = async (values) => {
    setServiceWeight(values.weight);
    
    try {
      const res = await calculateRecipePrice(selectedRecipe.id, values.weight);
      if (res.success) {
        setPriceInfo(res.data);
        setCurrentStep(2);
      }
    } catch (error) {
      message.error('计算价格失败');
    }
  };

  // 确认服务
  const handleConfirmService = () => {
    // 生成服务单
    const order = {
      orderNo: `S${Date.now()}`,
      member: selectedMember,
      recipe: selectedRecipe,
      weight: serviceWeight,
      priceInfo: priceInfo,
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      operator: JSON.parse(localStorage.getItem('user') || '{}').name
    };
    
    setServiceOrder(order);
    setCurrentStep(3);
    message.success('服务单生成成功');
  };

  // 打印服务单
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `服务单_${serviceOrder?.orderNo}`,
    onAfterPrint: () => {
      message.success('打印成功');
    }
  });

  // 重新开始
  const handleReset = () => {
    setCurrentStep(0);
    setSelectedMember(null);
    setSelectedRecipe(null);
    setServiceWeight(100);
    setPriceInfo(null);
    setServiceOrder(null);
    memberForm.resetFields();
    recipeForm.resetFields();
    fetchRecipes();
  };

  // 步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // 选择会员
        return (
          <Card title="会员识别">
            <Form
              form={memberForm}
              layout="vertical"
              onFinish={handleSearchMember}
            >
              <Form.Item
                name="phone"
                label="会员手机号"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入会员手机号"
                  size="large"
                />
              </Form.Item>
              
              <Form.Item>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Button type="primary" htmlType="submit" size="large">
                    查找会员
                  </Button>
                  <Button onClick={handleSkipMember} size="large">
                    跳过（非会员）
                  </Button>
                </Space>
              </Form.Item>
            </Form>

            {selectedMember && (
              <Alert
                message="会员信息"
                description={
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="姓名">{selectedMember.name}</Descriptions.Item>
                    <Descriptions.Item label="手机">{selectedMember.phone}</Descriptions.Item>
                    <Descriptions.Item label="积分">{selectedMember.points}</Descriptions.Item>
                  </Descriptions>
                }
                type="success"
                showIcon
              />
            )}
          </Card>
        );

      case 1: // 选择配方
        return (
          <Card title="选择配方">
            <div className="recipe-selection">
              <div className="recipe-tabs">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    size="large"
                    style={{ width: '100%', height: 60 }}
                    onClick={() => message.info('创建临时配方功能开发中')}
                  >
                    创建临时配方
                  </Button>
                  
                  <Divider>或选择现有配方</Divider>
                  
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: 50 }}>
                      <Spin size="large" />
                    </div>
                  ) : (
                    <List
                      dataSource={recipes}
                      renderItem={recipe => (
                        <List.Item
                          className={`recipe-item ${selectedRecipe?.id === recipe.id ? 'selected' : ''}`}
                          onClick={() => handleSelectRecipe(recipe)}
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                icon={<ExperimentOutlined />}
                                style={{ backgroundColor: recipe.type === 'public' ? '#1890ff' : '#52c41a' }}
                              />
                            }
                            title={
                              <Space>
                                {recipe.name}
                                <Tag color={recipe.type === 'public' ? 'blue' : 'green'}>
                                  {recipe.type === 'public' ? '公共' : '专属'}
                                </Tag>
                              </Space>
                            }
                            description={
                              <Space size="small" wrap>
                                {recipe.materials?.map(m => (
                                  <Tag key={m.id} size="small">
                                    {m.name} {m.RecipeMaterial?.percentage}%
                                  </Tag>
                                ))}
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Space>
              </div>

              {selectedRecipe && (
                <div className="recipe-form">
                  <Alert
                    message={`已选择配方：${selectedRecipe.name}`}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  
                  <Form
                    form={recipeForm}
                    layout="vertical"
                    onFinish={handleCalculatePrice}
                  >
                    <Form.Item
                      name="weight"
                      label="制作重量（克）"
                      rules={[
                        { required: true, message: '请输入重量' },
                        { type: 'number', min: 10, max: 5000, message: '重量范围：10-5000克' }
                      ]}
                    >
                      <InputNumber
                        min={10}
                        max={5000}
                        step={10}
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="请输入制作重量"
                      />
                    </Form.Item>
                    
                    <Form.Item>
                      <Button type="primary" htmlType="submit" size="large" block>
                        计算价格
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              )}
            </div>
          </Card>
        );

      case 2: // 确认价格
        return (
          <Card title="确认价格">
            {priceInfo && (
              <>
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="配方名称">
                    {selectedRecipe?.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="制作重量">
                    {priceInfo.weight} 克
                  </Descriptions.Item>
                  <Descriptions.Item label="材料成本">
                    ¥{priceInfo.materialCost}
                  </Descriptions.Item>
                  <Descriptions.Item label="加工费">
                    ¥{priceInfo.processingFee}
                  </Descriptions.Item>
                  <Descriptions.Item label="总价">
                    <strong style={{ color: '#f5222d', fontSize: 20 }}>
                      ¥{priceInfo.totalPrice}
                    </strong>
                  </Descriptions.Item>
                </Descriptions>

                {priceInfo.materialDetails && (
                  <>
                    <Divider>材料明细</Divider>
                    <Table
                      dataSource={priceInfo.materialDetails}
                      columns={[
                        {
                          title: '材料名称',
                          dataIndex: 'name',
                          key: 'name'
                        },
                        {
                          title: '重量(克)',
                          dataIndex: 'weight',
                          key: 'weight',
                          align: 'right',
                          render: (weight) => weight.toFixed(2)
                        },
                        {
                          title: '金额',
                          dataIndex: 'price',
                          key: 'price',
                          align: 'right',
                          render: (price) => `¥${price.toFixed(2)}`
                        }
                      ]}
                      pagination={false}
                      size="small"
                      rowKey="name"
                    />
                  </>
                )}

                <Divider />
                
                <Space style={{ width: '100%', justifyContent: 'center' }}>
                  <Button onClick={() => setCurrentStep(1)} size="large">
                    返回修改
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleConfirmService}
                    size="large"
                  >
                    确认服务
                  </Button>
                </Space>
              </>
            )}
          </Card>
        );

      case 3: // 完成
        return (
          <Result
            status="success"
            title="服务单生成成功"
            subTitle={`服务单号：${serviceOrder?.orderNo}`}
            extra={[
              <Button
                type="primary"
                key="print"
                icon={<PrinterOutlined />}
                onClick={handlePrint}
              >
                打印服务单
              </Button>,
              <Button key="new" onClick={handleReset}>
                新建服务
              </Button>
            ]}
          >
            <div className="service-order-preview" ref={printRef}>
              <div style={{ padding: 24, background: '#fff' }}>
                <h2 style={{ textAlign: 'center' }}>神龙磨坊 - 磨粉服务单</h2>
                <Divider />
                
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="服务单号">
                    {serviceOrder?.orderNo}
                  </Descriptions.Item>
                  <Descriptions.Item label="服务时间">
                    {serviceOrder?.createdAt}
                  </Descriptions.Item>
                  <Descriptions.Item label="会员姓名">
                    {serviceOrder?.member?.name || '非会员'}
                  </Descriptions.Item>
                  <Descriptions.Item label="会员手机">
                    {serviceOrder?.member?.phone || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="配方名称" span={2}>
                    {serviceOrder?.recipe?.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="制作重量">
                    {serviceOrder?.weight} 克
                  </Descriptions.Item>
                  <Descriptions.Item label="服务费用">
                    <strong>¥{serviceOrder?.priceInfo?.totalPrice}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="操作员" span={2}>
                    {serviceOrder?.operator}
                  </Descriptions.Item>
                </Descriptions>
                
                <Divider />
                
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <p>感谢您的光临！</p>
                  <p style={{ fontSize: 12, color: '#999' }}>
                    请妥善保管此单据，凭单取货
                  </p>
                </div>
              </div>
            </div>
          </Result>
        );

      default:
        return null;
    }
  };

  return (
    <div className="recipe-service-page">
      <Card>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          <Step title="会员识别" icon={<UserOutlined />} />
          <Step title="选择配方" icon={<ExperimentOutlined />} />
          <Step title="确认价格" icon={<CalculatorOutlined />} />
          <Step title="完成" icon={<CheckCircleOutlined />} />
        </Steps>

        {renderStepContent()}
      </Card>
    </div>
  );
};

export default RecipeService;