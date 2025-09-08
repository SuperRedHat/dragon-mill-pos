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
  Spin,
  Select,
  Checkbox, 
  Tooltip,  
  Popover, 
  Progress
} from 'antd';
import CartManager from '@/utils/cartManager';
import UnitConverter from '@/utils/unitConverter';
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
  CalendarOutlined,
  ExperimentOutlined,
  PercentageOutlined,
  InfoCircleOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { getCashierProducts, searchProducts, checkout, getTodayStats } from '@/api/cashier';
import { getRecipesForSale, calculateRecipeForCashier, createRecipe } from '@/api/recipes';
import { getMemberByPhone, searchMembers } from '@/api/members';
import { getProductList } from '@/api/products';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Search } = Input;
const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;


const Cashier = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeWeight, setRecipeWeight] = useState(100);
  const [recipeForm] = Form.useForm();
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
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

  // 在其他 state 后面添加
  const [createRecipeModalVisible, setCreateRecipeModalVisible] = useState(false);
  const [tempRecipeForm] = Form.useForm();
  const [recipeProducts, setRecipeProducts] = useState([]);
  const [memberRecipes, setMemberRecipes] = useState([]); // 会员专属配方
  const [showMemberRecipes, setShowMemberRecipes] = useState(false); // 是否显示专属配方
  const [selectedCartItems, setSelectedCartItems] = useState([]); // 选中的购物车商品
  const [generateRecipeVisible, setGenerateRecipeVisible] = useState(false); // 生成配方弹窗
  const [generateRecipeForm] = Form.useForm();

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
      console.log('商品数据响应:', res); // 添加调试日志
      if (res.success) {
        setProducts(res.data);
        console.log('设置的商品数据:', res.data); // 添加调试日志
      }
    } catch (error) {
      console.log('设置的商品数据:', res.data); // 添加调试日志
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

  // 获取配方列表
  const fetchRecipes = async () => {
    setRecipesLoading(true);
    try {
      const res = await getRecipesForSale(selectedMember?.id);
      if (res.success) {
        setRecipes(res.data);
      }
    } catch (error) {
      console.error('获取配方失败:', error);
    }finally {
      setRecipesLoading(false);
    }
  };

  
  // 获取材料列表
  const fetchMaterials = async () => {
    try {
      const res = await getMaterialList({ status: 'active', pageSize: 100 });
      if (res.success) {
        setMaterials(res.data.list);
      }
    } catch (error) {
      console.error('获取材料失败:', error);
    }
  };

  // 添加快速重新下单功能
  const handleQuickReorder = async (recipe) => {
    // 获取该配方最近一次的使用重量（可以从订单历史获取）
    const defaultWeight = recipe.lastWeight || 100;
    
    // 直接使用上次的重量，减少操作步骤
    const res = await calculateRecipeForCashier({
      recipeId: recipe.id,
      weight: defaultWeight
    });
    
    if (res.success) {
      const { data } = res;
      // 添加到购物车
      setCart([...cart, {
        id: `recipe-${recipe.id}-${Date.now()}`,
        recipeId: recipe.id,
        name: `配方：${recipe.name}`,
        price: parseFloat(data.totalPrice),
        quantity: 1,
        subtotal: parseFloat(data.totalPrice),
        unit: '份',
        isRecipe: true,
        weight: defaultWeight,
        recipeDetails: {
          recipeName: recipe.name,
          materials: recipe.products?.map(p => ({
            name: p.name,
            percentage: p.RecipeProduct.percentage,
            gramAmount: defaultWeight * p.RecipeProduct.percentage / 100
          })),
          weight: defaultWeight
        }
      }]);
      
      message.success(`已添加 ${recipe.name} (${defaultWeight}g) 到购物车`);
    }
  };

  // 处理创建临时配方
  const handleCreateTempRecipe = () => {
    setCreateRecipeModalVisible(true);
    tempRecipeForm.setFieldsValue({
      name: '临时配方',
      weight: 100,
      materials: [{ materialId: undefined, percentage: 100 }]
    });
  };

  // 提交临时配方
  const handleSubmitTempRecipe = async (values) => {
    try {
      // 验证配比总和
      const totalPercentage = values.materials.reduce((sum, m) => 
        sum + parseFloat(m.percentage || 0), 0
      );
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        message.error('材料配比总和必须为100%');
        return;
      }
      
      // 计算价格
      let materialCost = 0;
      const materialList = [];
      
      for (const item of values.materials) {
        const product = recipeProducts.find(p => p.id === item.productId);  // 使用 recipeProducts
        if (product) {
          const materialWeight = values.weight * item.percentage / 100;
          const unitPrice = product.cost || product.price;  // 使用成本价或售价
          const cost = materialWeight * unitPrice / 1000;
          materialCost += cost;
          materialList.push({
            ...product,
            percentage: item.percentage,
            weight: materialWeight,
            cost
          });
        }
      }
      
      const processingFee = 5; // 默认加工费
      const totalPrice = materialCost + processingFee;
      
      // 创建临时配方对象
      const tempRecipe = {
        id: `temp-${Date.now()}`,
        name: values.name,
        type: 'temp',
        materials: materialList,
        weight: values.weight,
        materialCost,
        processingFee,
        totalPrice,
        isTemp: true
      };
      
      // 添加到购物车
      setCart([...cart, {
        id: tempRecipe.id,
        recipeId: tempRecipe.id,
        name: `配方：${tempRecipe.name}`,
        price: totalPrice,
        quantity: 1,
        subtotal: totalPrice,
        unit: '份',
        isRecipe: true,
        isTemp: true,
        weight: values.weight,
        materials: materialList,
        recipeDetails: {
          recipeName: tempRecipe.name,
          materials: materialList,
          weight: values.weight
        }
      }]);
      
      message.success('临时配方已添加到购物车');
      setCreateRecipeModalVisible(false);
      tempRecipeForm.resetFields();
      
      // 询问是否保存为正式配方
      if (selectedMember) {
        modal.confirm({
          title: '保存配方',
          content: '是否将此配方保存为专属配方，方便下次使用？',
          onOk: async () => {
            await saveAsRecipe(tempRecipe, 'private');
          },
          okText: '保存',
          cancelText: '暂不保存'
        });
      }
    } catch (error) {
      message.error('创建临时配方失败');
    }
  };

  // 添加保存配方函数
  const saveAsRecipe = async (tempRecipe, type) => {
    try {
      const recipeData = {
        name: tempRecipe.name,
        type: type,
        memberId: type === 'private' ? selectedMember?.id : null,
        description: `${selectedMember?.name || '客户'}在收银台创建的配方`,
        totalWeight: tempRecipe.weight,
        processingFee: tempRecipe.processingFee || 5,
        materials: tempRecipe.materials.map(m => ({
          productId: m.id,
          percentage: m.percentage
        }))
      };
      
      const res = await createRecipe(recipeData);
      
      if (res.success) {
        message.success(`配方已保存为${type === 'private' ? '专属' : '公共'}配方`);
        
        // 刷新配方列表
        fetchRecipes();
        
        // 如果是会员专属配方，更新会员配方列表
        if (type === 'private' && selectedMember) {
          const updatedMemberRecipes = [...memberRecipes, res.data];
          setMemberRecipes(updatedMemberRecipes);
        }
      }
    } catch (error) {
      message.error('保存配方失败');
    }
  };

  // 获取可用作配方材料的商品
  const fetchRecipeProducts = async () => {
    try {
      const res = await getProductList({ 
        status: 'on_sale', 
        pageSize: 100 
      });
      if (res.success) {
        setRecipeProducts(res.data.list);
      }
    } catch (error) {
      console.error('获取商品失败:', error);
    }
  };
  
  useEffect(() => {
    fetchProducts();
    fetchTodayStats();
    fetchRecipes();
    fetchRecipeProducts();
    // 检查是否有从配方管理页面传来的配方
    const checkTempCart = async () => {
      const tempCart = CartManager.getValidCart();
      
      if (tempCart.length > 0) {
        modal.confirm({
          title: '检测到待处理配方',
          content: (
            <div>
              <p>您有 {tempCart.length} 个配方待添加到购物车：</p>
              {tempCart.map(item => (
                <Tag key={item.id} color="blue" style={{ marginBottom: 4 }}>
                  {item.recipeName} ({item.weight}g)
                </Tag>
              ))}
            </div>
          ),
          onOk: async () => {
            // 逐个添加配方到购物车
            for (const item of tempCart) {
              if (item.recipe) {
                // 计算价格
                const res = await calculateRecipeForCashier({
                  recipeId: item.recipe.id,
                  weight: item.weight
                });
                
                if (res.success) {
                  const { data } = res;
                  setCart(prev => [...prev, {
                    id: `recipe-${item.recipe.id}-${Date.now()}`,
                    recipeId: item.recipe.id,
                    name: `配方：${item.recipeName}`,
                    price: parseFloat(data.totalPrice),
                    quantity: 1,
                    subtotal: parseFloat(data.totalPrice),
                    unit: '份',
                    isRecipe: true,
                    weight: item.weight,
                    recipeDetails: {
                      recipeName: item.recipeName,
                      materials: item.recipe.products?.map(p => ({
                        name: p.name,
                        percentage: p.RecipeProduct?.percentage,
                        gramAmount: item.weight * p.RecipeProduct?.percentage / 100
                      })),
                      weight: item.weight
                    }
                  }]);
                }
              }
            }
            
            // 清空临时购物车
            CartManager.clearCart();
            message.success('配方已添加到购物车');
          },
          onCancel: () => {
            // 清空临时购物车
            CartManager.clearCart();
          },
          okText: '添加到购物车',
          cancelText: '忽略'
        });
      }
    };
    
    checkTempCart();
    
    // 监听配方购物车更新事件
    const handleCartUpdate = (event) => {
      if (event.detail.action === 'add') {
        // 新配方添加，可以实时处理
        console.log('新配方添加:', event.detail.item);
      }
    };
    
    window.addEventListener('recipeCartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('recipeCartUpdated', handleCartUpdate);
    };
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
      setShowMemberRecipes(false);
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
              <div className="member-search-result">
                <div className="member-info">
                  <div className="member-basic">
                    <strong>{member.name}</strong>
                    <span className="phone">{member.phone}</span>
                    <span className="member-no">No.{member.memberNo}</span>
                  </div>
                  <div className="member-stats">
                    <Tag color="gold" size="small">
                      <GiftOutlined /> {member.points}积分
                    </Tag>
                    <span className="consumption">
                      累计: ¥{parseFloat(member.totalConsumption || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {member.recipes && member.recipes.length > 0 && (
                  <div className="member-recipes">
                    <Divider style={{ margin: '8px 0' }}>
                      专属配方({member.recipes.length})
                    </Divider>
                    {member.recipes.slice(0, 3).map(recipe => (
                      <div key={recipe.id} className="recipe-quick-item">
                        <Badge 
                          count={recipe.usageCount} 
                          style={{ backgroundColor: '#52c41a' }}
                          size="small"
                        >
                          <Tag 
                            color="blue" 
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAddRecipe(recipe, member);
                            }}
                          >
                            <ExperimentOutlined /> {recipe.displayName}
                          </Tag>
                        </Badge>
                        <div className="recipe-materials">
                          {recipe.materials?.map(m => (
                            <span key={m.name} className="material-tag">
                              {m.name} {m.percentage}%
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {member.recipes.length > 3 && (
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        还有 {member.recipes.length - 3} 个配方...
                      </div>
                    )}
                  </div>
                )}
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

  // 新增快速添加配方功能
  const handleQuickAddRecipe = async (recipe, member) => {
    // 弹窗输入重量
    modal.confirm({
      title: `添加配方：${recipe.displayName}`,
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <UserOutlined /> {member.name}
              <Tag color="blue">{member.phone}</Tag>
            </Space>
          </div>
          <Form layout="vertical" initialValues={{ weight: 100 }}>
            <Form.Item label="制作重量（克）" name="weight">
              <InputNumber
                min={50}
                max={5000}
                step={50}
                style={{ width: '100%' }}
                id="recipe-weight-input"
              />
            </Form.Item>
          </Form>
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>配方材料：</div>
            {recipe.materials?.map(m => (
              <Tag key={m.name} color="orange">
                {m.name} {m.percentage}%
              </Tag>
            ))}
          </div>
        </div>
      ),
      onOk: async () => {
        const weightInput = document.getElementById('recipe-weight-input');
        const weight = parseFloat(weightInput?.value || 100);
        
        // 计算价格
        const res = await calculateRecipeForCashier({
          recipeId: recipe.id,
          weight: weight
        });
        
        if (res.success) {
          const { data } = res;
          // 添加到购物车
          setCart([...cart, {
            id: `recipe-${recipe.id}-${Date.now()}`,
            recipeId: recipe.id,
            name: `配方：${recipe.displayName}`,
            price: parseFloat(data.totalPrice),
            quantity: 1,
            subtotal: parseFloat(data.totalPrice),
            unit: '份',
            isRecipe: true,
            weight: weight,
            recipeDetails: {
              recipeName: recipe.name,
              materials: recipe.materials,
              weight: weight
            }
          }]);
          
          // 如果还没选择会员，自动选择
          if (!selectedMember) {
            setSelectedMember(member);
          }
          
          message.success('配方已添加到购物车');
        }
      }
    });
  };

  // 选择会员
  const handleSelectMember = (value, option) => {
    const member = option.member;
    setSelectedMember(member);
    setMemberRecipes(member.recipes || []);
    setShowMemberRecipes(true);
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
    
    // 生成商品明细HTML
    const itemsHtml = orderData.items.map(item => {
      let itemHtml = `
        <div class="row">
          <span>${item.productName} x${item.quantity}</span>
          <span>¥${item.subtotal.toFixed(2)}</span>
        </div>
      `;
      
      // 如果是配方，添加材料明细
      if (item.isRecipe && item.recipeDetails) {
        itemHtml += `
          <div class="recipe-details">
            <div class="recipe-title">配方材料 (${item.recipeDetails.weight}g):</div>
            ${item.recipeDetails.materials.map(m => `
              <div class="recipe-item">
                · ${m.name} ${m.percentage}% (${m.gramAmount?.toFixed(1)}g)
              </div>
            `).join('')}
          </div>
        `;
      }
      
      return itemHtml;
    }).join('');
    
    const html = `
      <html>
        <head>
          <title>小票</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              width: 300px; 
              margin: 0 auto;
              font-size: 12px;
            }
            h3 { text-align: center; margin: 10px 0; }
            hr { border: 1px dashed #000; margin: 10px 0; }
            .row { 
              display: flex; 
              justify-content: space-between;
              margin: 5px 0;
            }
            .recipe-details {
              margin: 5px 0 5px 20px;
              font-size: 11px;
              color: #333;
            }
            .recipe-title {
              font-weight: bold;
              margin: 3px 0;
            }
            .recipe-item {
              margin: 2px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
            }
            .member-info {
              margin: 10px 0;
              padding: 5px;
              border: 1px solid #ccc;
            }
          </style>
        </head>
        <body>
          <h3>神龙磨坊</h3>
          <div style="text-align: center; font-size: 10px;">
            ${new Date().toLocaleString()}
          </div>
          <hr/>
          
          ${orderData.member ? `
            <div class="member-info">
              <div>会员: ${orderData.member.name}</div>
              <div>电话: ${orderData.member.phone}</div>
              <div>积分: ${orderData.member.points}</div>
            </div>
            <hr/>
          ` : ''}
          
          <div style="font-weight: bold; margin: 10px 0;">商品明细：</div>
          ${itemsHtml}
          
          <hr/>
          
          <div class="row">
            <span>商品总额:</span>
            <span>¥${orderData.totalAmount.toFixed(2)}</span>
          </div>
          
          ${orderData.discountAmount > 0 ? `
            <div class="row">
              <span>优惠金额:</span>
              <span>-¥${orderData.discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          
          ${orderData.pointsUsed > 0 ? `
            <div class="row">
              <span>积分抵扣:</span>
              <span>-¥${(orderData.pointsUsed / 100).toFixed(2)}</span>
            </div>
          ` : ''}
          
          <div class="row" style="font-weight: bold; font-size: 14px;">
            <span>实付金额:</span>
            <span>¥${orderData.actualAmount.toFixed(2)}</span>
          </div>
          
          <hr/>
          
          <div class="row">
            <span>支付方式:</span>
            <span>${{
              'cash': '现金',
              'wechat': '微信支付',
              'alipay': '支付宝',
              'card': '银行卡'
            }[orderData.paymentMethod] || orderData.paymentMethod}</span>
          </div>
          
          ${orderData.pointsEarned > 0 ? `
            <div class="row">
              <span>获得积分:</span>
              <span>+${orderData.pointsEarned}</span>
            </div>
          ` : ''}
          
          <hr/>
          
          <div class="row">
            <span>订单号:</span>
            <span style="font-size: 10px;">${orderData.orderNo}</span>
          </div>
          
          <div class="row">
            <span>收银员:</span>
            <span>${orderData.cashier || '系统'}</span>
          </div>
          
          <div class="footer">
            <hr/>
            <p>谢谢惠顾，欢迎下次光临！</p>
            <p style="font-size: 10px;">服务热线：400-XXX-XXXX</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    // 等待内容加载完成后打印
    printWindow.onload = () => {
      printWindow.print();
      // 打印完成后关闭窗口
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  };

  // 确认支付
  const handlePayment = async (values) => {
    setCheckoutLoading(true);
    try {
      // 分离普通商品和配方
      const products = cart.filter(item => !item.isRecipe);
      const recipes = cart.filter(item => item.isRecipe);
      
      const orderData = {
        memberId: selectedMember?.id,
        items: products.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        recipes: recipes.map(item => ({
          recipeId: item.recipeId,
          weight: item.weight,
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
      title: (
        <Checkbox
          checked={selectedCartItems.length === cart.filter(item => !item.isRecipe).length}
          indeterminate={selectedCartItems.length > 0 && selectedCartItems.length < cart.filter(item => !item.isRecipe).length}
          onChange={(e) => {
            if (e.target.checked) {
              // 全选非配方商品
              setSelectedCartItems(cart.filter(item => !item.isRecipe).map(item => item.id));
            } else {
              setSelectedCartItems([]);
            }
          }}
        />
      ),
      key: 'selection',
      width: 50,
      render: (_, record) => {
        // 配方项不能被选中
        if (record.isRecipe) {
          return <Tag size="small" color="blue">配方</Tag>;
        }
        return (
          <Checkbox
            checked={selectedCartItems.includes(record.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedCartItems([...selectedCartItems, record.id]);
              } else {
                setSelectedCartItems(selectedCartItems.filter(id => id !== record.id));
              }
            }}
          />
        );
      }
    },
    {
      title: '商品',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text, record) => {
        if (record.isRecipe && record.recipeDetails) {
          return (
            <div>
              <div style={{ fontWeight: 500 }}>
                {text}
                <Tag color="blue" size="small" style={{ marginLeft: 8 }}>
                  {record.weight}g
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                <Popover
                  content={
                    <div style={{ maxWidth: 300 }}>
                      <div style={{ fontWeight: 500, marginBottom: 8 }}>
                        配方材料明细：
                      </div>
                      {record.recipeDetails.materials?.map((m, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>
                          <Space>
                            <span>{m.name}</span>
                            <Tag size="small" color="orange">
                              {m.percentage}%
                            </Tag>
                            <span style={{ color: '#999' }}>
                              {m.gramAmount?.toFixed(1)}g
                            </span>
                          </Space>
                        </div>
                      ))}
                    </div>
                  }
                  trigger="hover"
                >
                  <Space style={{ cursor: 'pointer' }}>
                    <InfoCircleOutlined />
                    <span>
                      {record.recipeDetails.materials
                        ?.slice(0, 2)
                        .map(m => `${m.name} ${m.percentage}%`)
                        .join('、')}
                      {record.recipeDetails.materials?.length > 2 && '...'}
                    </span>
                  </Space>
                </Popover>
              </div>
            </div>
          );
        }
        return text;
      }
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

  // 处理生成配方
  const handleGenerateRecipe = () => {
    const selectedItems = cart.filter(item => selectedCartItems.includes(item.id));
    
    if (selectedItems.length === 0) {
      message.warning('请选择要生成配方的商品');
      return;
    }
    
    // 计算总重量和配比
    const totalWeight = selectedItems.reduce((sum, item) => {
      // 需要将不同单位转换为克
      const grams = UnitConverter.toGram(item.quantity, item.unit);
      return sum + grams;
    }, 0);
    
    // 生成默认配方名称
    const mainIngredients = selectedItems
      .sort((a, b) => {
        const aGrams = UnitConverter.toGram(a.quantity, a.unit);
        const bGrams = UnitConverter.toGram(b.quantity, b.unit);
        return bGrams - aGrams;
      })
      .slice(0, 2)
      .map(item => item.name)
      .join('');
    
    const defaultName = selectedMember 
      ? `${selectedMember.phone.slice(-4)}的${mainIngredients}配方`
      : `${mainIngredients}营养配方`;
    
    // 设置表单初始值
    generateRecipeForm.setFieldsValue({
      name: defaultName,
      standardWeight: 100,
      processingFee: 5.00,
      saveType: selectedMember ? 'private' : 'temp',
      materials: selectedItems.map(item => {
        const grams = UnitConverter.toGram(item.quantity, item.unit);
        const percentage = (grams / totalWeight * 100).toFixed(2);
        return {
          productId: item.id,
          productName: item.name,
          originalQuantity: item.quantity,
          originalUnit: item.unit,
          grams: grams,
          percentage: parseFloat(percentage)
        };
      })
    });
    
    setGenerateRecipeVisible(true);
  };

  // 提交生成的配方
  const handleSubmitGenerateRecipe = async (values) => {
    try {
      const { saveType, materials, standardWeight, customWeight } = values;
      const targetWeight = standardWeight === 'custom' ? customWeight : standardWeight;
      
      // 如果需要保存为正式配方
      if (saveType !== 'temp') {
        const recipeData = {
          name: values.name,
          type: saveType === 'private' ? 'private' : 'public',
          memberId: saveType === 'private' ? selectedMember?.id : null,
          description: values.description,
          totalWeight: targetWeight,
          processingFee: values.processingFee,
          materials: materials.map(m => ({
            productId: m.productId,
            percentage: m.percentage
          }))
        };
        
        // 调用API保存配方
        const res = await createRecipe(recipeData);
        
        if (res.success) {
          message.success('配方保存成功');
          
          // 计算价格
          const priceRes = await calculateRecipeForCashier({
            recipeId: res.data.id,
            weight: targetWeight
          });
          
          if (priceRes.success) {
            // 移除原购物车中选中的商品
            const newCart = cart.filter(item => !selectedCartItems.includes(item.id));
            
            // 添加配方到购物车
            newCart.push({
              id: `recipe-${res.data.id}-${Date.now()}`,
              recipeId: res.data.id,
              name: `配方：${values.name}`,
              price: parseFloat(priceRes.data.totalPrice),
              quantity: 1,
              subtotal: parseFloat(priceRes.data.totalPrice),
              unit: '份',
              isRecipe: true,
              weight: targetWeight,
              recipeDetails: {
                recipeName: values.name,
                materials: materials.map(m => ({
                  name: m.productName,
                  percentage: m.percentage,
                  gramAmount: targetWeight * m.percentage / 100
                })),
                weight: targetWeight
              }
            });
            
            setCart(newCart);
            
            // 如果是专属配方，刷新配方列表
            if (saveType === 'private') {
              fetchRecipes();
            }
          }
        }
      } else {
        // 临时配方，直接生成
        const tempRecipe = {
          id: `temp-${Date.now()}`,
          name: values.name,
          type: 'temp',
          materials: materials.map(m => ({
            id: m.productId,
            name: m.productName,
            percentage: m.percentage,
            gramAmount: targetWeight * m.percentage / 100
          })),
          weight: targetWeight,
          processingFee: values.processingFee
        };
        
        // 计算价格
        let materialCost = 0;
        for (const material of materials) {
          const product = cart.find(item => item.id === material.productId);
          if (product) {
            const unitPrice = product.cost || product.price;
            const materialGrams = targetWeight * material.percentage / 100;
            materialCost += (materialGrams / 1000) * unitPrice;
          }
        }
        
        const totalPrice = materialCost + values.processingFee;
        
        // 移除原购物车商品，添加配方
        const newCart = cart.filter(item => !selectedCartItems.includes(item.id));
        newCart.push({
          id: tempRecipe.id,
          name: `配方：${tempRecipe.name}`,
          price: totalPrice,
          quantity: 1,
          subtotal: totalPrice,
          unit: '份',
          isRecipe: true,
          isTemp: true,
          weight: targetWeight,
          recipeDetails: {
            recipeName: tempRecipe.name,
            materials: tempRecipe.materials,
            weight: targetWeight
          }
        });
        
        setCart(newCart);
        message.success('临时配方已生成');
      }
      
      // 清理状态
      setGenerateRecipeVisible(false);
      generateRecipeForm.resetFields();
      setSelectedCartItems([]);
      
    } catch (error) {
      console.error('生成配方失败:', error);
      message.error('生成配方失败');
    }
  };

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
    
  // 检测相似配方
  const checkSimilarRecipes = async (materials) => {
    try {
      // 获取所有配方
      const allRecipes = [...recipes];
      if (selectedMember && memberRecipes.length > 0) {
        allRecipes.push(...memberRecipes);
      }
      
      // 计算相似度
      const similarities = allRecipes.map(recipe => {
        if (!recipe.products || recipe.products.length === 0) return null;
        
        // 计算材料重合度
        const recipeMaterials = recipe.products.map(p => p.id);
        const currentMaterials = materials.map(m => m.productId);
        
        const intersection = recipeMaterials.filter(id => currentMaterials.includes(id));
        const union = [...new Set([...recipeMaterials, ...currentMaterials])];
        
        const similarity = intersection.length / union.length;
        
        if (similarity > 0.7) { // 相似度超过70%
          return {
            recipe,
            similarity: (similarity * 100).toFixed(0)
          };
        }
        return null;
      }).filter(Boolean);
      
      if (similarities.length > 0) {
        // 显示相似配方提醒
        Modal.info({
          title: '发现相似配方',
          content: (
            <div>
              <p>系统发现以下相似配方：</p>
              {similarities.map(item => (
                <div key={item.recipe.id} style={{ marginBottom: 8 }}>
                  <Space>
                    <Tag color="blue">{item.recipe.name}</Tag>
                    <span>相似度: {item.similarity}%</span>
                  </Space>
                </div>
              ))}
              <p style={{ marginTop: 16 }}>
                您可以直接使用已有配方，或继续创建新配方。
              </p>
            </div>
          ),
          onOk: () => {
            // 继续创建
          }
        });
      }
    } catch (error) {
      console.error('检测相似配方失败:', error);
    }
  };


  // 点击配方
  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe);
    modal.confirm({
      title: `添加配方：${recipe.name}`,
      content: (
        <Form layout="vertical">
          <Form.Item label="重量（克）">
            <InputNumber
              min={50}
              max={5000}
              step={50}
              defaultValue={100}
              onChange={setRecipeWeight}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      ),
      onOk: async () => {
        const res = await calculateRecipeForCashier({
          recipeId: recipe.id,
          weight: recipeWeight
        });
        
        if (res.success) {
          const { data } = res;
          // 添加到购物车
          setCart([...cart, {
            id: `recipe-${recipe.id}`,
            recipeId: recipe.id,
            name: data.recipeName,
            price: parseFloat(data.totalPrice),
            quantity: 1,
            subtotal: parseFloat(data.totalPrice),
            unit: '份',
            isRecipe: true,
            weight: recipeWeight
          }]);
          
          message.success('配方已添加到购物车');
        }
      }
    });
  };

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
      key: 'recipes',
      label: (
        <Badge count={recipes.length} offset={[10, 0]}>
          <ExperimentOutlined /> 配方
        </Badge>
      ),
      children: (
        <div className="recipes-container">
          {/* 如果有选中的会员，优先显示其专属配方 */}
          {selectedMember && memberRecipes.length > 0 && (
            <div className="member-recipes-section">
              <Divider orientation="left">
                <Space>
                  <UserOutlined />
                  {selectedMember.name}的专属配方
                  <Tag color="blue">{memberRecipes.length}个</Tag>
                </Space>
              </Divider>
              <Row gutter={[12, 12]}>
                {memberRecipes.map(recipe => (
                  <Col key={recipe.id} xs={12} sm={8} md={6}>
                    <Card
                      hoverable
                      className="recipe-item member-recipe"
                      onClick={() => handleRecipeClick(recipe)}
                    >
                      <div className="recipe-header">
                        <Badge 
                          count={recipe.usageCount} 
                          style={{ backgroundColor: '#52c41a' }}
                        >
                          <Avatar 
                            size={48} 
                            icon={<ExperimentOutlined />}
                            style={{ backgroundColor: '#722ed1' }}
                          />
                        </Badge>
                        <Tag color="purple" className="recipe-badge">专属</Tag>
                      </div>
                      <div className="recipe-info">
                        <div className="recipe-name">{recipe.name}</div>
                        <div className="recipe-materials">
                          {recipe.products?.slice(0, 2).map(m => (
                            <Tag key={m.id} size="small" color="orange">
                              {m.name} {m.RecipeProduct.percentage}%
                            </Tag>
                          ))}
                          {recipe.products?.length > 2 && (
                            <Tag size="small">+{recipe.products.length - 2}</Tag>
                          )}
                        </div>
                        <div className="recipe-footer">
                          <Button 
                            type="link" 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickReorder(recipe);
                            }}
                          >
                            再来一份
                          </Button>
                          <span className="last-used">
                            {recipe.lastUsed ? `上次: ${dayjs(recipe.lastUsed).fromNow()}` : ''}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
          
          {/* 公共配方区域 */}
          <Divider orientation="left">
            <Space>
              <GlobalOutlined />
              公共配方
            </Space>
          </Divider>
          
          {recipesLoading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>加载配方中...</div>
            </div>
          ) : (
            <div className="products-grid">
              <Row gutter={[12, 12]}>
                {recipes
                  .filter(r => r.type === 'public')
                  .map(recipe => (
                    <Col key={recipe.id} xs={12} sm={8} md={6}>
                      {/* 原有的配方卡片代码 */}
                    </Col>
                  ))}
                
                {/* 创建配方卡片 */}
                <Col xs={12} sm={8} md={6}>
                  <Card
                    hoverable
                    className="create-recipe-card"
                    onClick={handleCreateTempRecipe}
                    style={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      minHeight: 150
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <PlusOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                      <div style={{ marginTop: 8 }}>创建配方</div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}
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

            <div className="cart-actions" style={{ marginTop: 12 }}>
              <Space>
                {selectedCartItems.length > 0 && (
                  <>
                    <Button
                      icon={<ExperimentOutlined />}
                      onClick={handleGenerateRecipe}
                    >
                      生成配方 ({selectedCartItems.length}项)
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setSelectedCartItems([])}
                    >
                      取消选择
                    </Button>
                  </>
                )}
              </Space>
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
      
      {/* 生成配方弹窗 */}
      <Modal
        title="生成配方"
        open={generateRecipeVisible}
        onCancel={() => {
          setGenerateRecipeVisible(false);
          generateRecipeForm.resetFields();
        }}
        width={800}
        footer={null}
      >
        <Form
          form={generateRecipeForm}
          layout="vertical"
          onFinish={handleSubmitGenerateRecipe}
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
                name="standardWeight"
                label="标准重量(克)"
                rules={[{ required: true, message: '请输入标准重量' }]}
                extra="将配方规整到标准重量"
              >
                <Select>
                  <Option value={100}>100克</Option>
                  <Option value={250}>250克</Option>
                  <Option value={500}>500克</Option>
                  <Option value={1000}>1000克</Option>
                  <Option value="custom">自定义</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          {/* 自定义重量输入 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.standardWeight !== currentValues.standardWeight
            }
          >
            {({ getFieldValue }) => 
              getFieldValue('standardWeight') === 'custom' && (
                <Form.Item
                  name="customWeight"
                  label="自定义标准重量(克)"
                  rules={[
                    { required: true, message: '请输入重量' },
                    { type: 'number', min: 10, max: 5000, message: '重量范围10-5000克' }
                  ]}
                >
                  <InputNumber
                    min={10}
                    max={5000}
                    style={{ width: '100%' }}
                    placeholder="请输入标准重量"
                  />
                </Form.Item>
              )
            }
          </Form.Item>
          
          <Form.Item label="材料配比">
            <div style={{ 
              background: '#f5f5f5', 
              padding: 12, 
              borderRadius: 4,
              maxHeight: 300,
              overflowY: 'auto'
            }}>
              <Form.List name="materials">
                {(fields) => {
                  const materials = generateRecipeForm.getFieldValue('materials') || [];
                  const standardWeight = generateRecipeForm.getFieldValue('standardWeight');
                  const customWeight = generateRecipeForm.getFieldValue('customWeight');
                  const targetWeight = standardWeight === 'custom' ? customWeight : standardWeight;
                  
                  return (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <Space>
                          <Tag color="blue">原始总重: {materials.reduce((sum, m) => sum + m.grams, 0).toFixed(0)}克</Tag>
                          <ArrowRightOutlined />
                          <Tag color="green">标准重量: {targetWeight}克</Tag>
                        </Space>
                      </div>
                      
                      <Table
                        dataSource={materials}
                        columns={[
                          {
                            title: '商品名称',
                            dataIndex: 'productName',
                            key: 'productName',
                            width: 150
                          },
                          {
                            title: '原始用量',
                            key: 'original',
                            render: (_, record) => (
                              <span>{record.originalQuantity}{record.originalUnit}</span>
                            )
                          },
                          {
                            title: '克重',
                            dataIndex: 'grams',
                            key: 'grams',
                            render: (value) => `${value.toFixed(0)}g`
                          },
                          {
                            title: '配比',
                            dataIndex: 'percentage',
                            key: 'percentage',
                            render: (value) => (
                              <Tag color={value > 30 ? 'orange' : 'blue'}>
                                {value.toFixed(1)}%
                              </Tag>
                            )
                          },
                          {
                            title: '标准用量',
                            key: 'standard',
                            render: (_, record) => {
                              const standardGrams = (targetWeight || 100) * record.percentage / 100;
                              return (
                                <span style={{ color: '#52c41a' }}>
                                  {standardGrams.toFixed(1)}g
                                </span>
                              );
                            }
                          }
                        ]}
                        pagination={false}
                        size="small"
                        rowKey="productId"
                      />
                      
                      <div style={{ marginTop: 12, textAlign: 'right' }}>
                        <Space>
                          <span>配比总和:</span>
                          <Tag color={
                            Math.abs(materials.reduce((sum, m) => sum + m.percentage, 0) - 100) < 0.01 
                              ? 'success' 
                              : 'error'
                          }>
                            {materials.reduce((sum, m) => sum + m.percentage, 0).toFixed(2)}%
                          </Tag>
                        </Space>
                      </div>
                    </>
                  );
                }}
              </Form.List>
            </div>
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="processingFee"
                label="加工费(元)"
                rules={[{ required: true, message: '请输入加工费' }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  prefix="¥"
                />
              </Form.Item>
            </Col>
            
            <Col span={16}>
              <Form.Item
                name="saveType"
                label="保存类型"
                rules={[{ required: true, message: '请选择保存类型' }]}
              >
                <Radio.Group>
                  <Radio value="temp">仅本次使用</Radio>
                  {selectedMember && (
                    <Radio value="private">
                      保存为专属配方（{selectedMember.name}）
                    </Radio>
                  )}
                  {currentUser.role === 'admin' && (
                    <Radio value="public">保存为公共配方</Radio>
                  )}
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.saveType !== currentValues.saveType
            }
          >
            {({ getFieldValue }) => 
              getFieldValue('saveType') !== 'temp' && (
                <Form.Item
                  name="description"
                  label="配方说明"
                >
                  <TextArea
                    rows={3}
                    placeholder="请输入配方说明（选填）"
                  />
                </Form.Item>
              )
            }
          </Form.Item>
          
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <InfoCircleOutlined />
                <Text type="secondary">
                  生成配方后，原购物车商品将被替换为此配方
                </Text>
              </Space>
              <Space>
                <Button onClick={() => {
                  setGenerateRecipeVisible(false);
                  generateRecipeForm.resetFields();
                }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  生成配方
                </Button>
              </Space>
            </Space>
          </Form.Item>
        </Form>
      </Modal>          

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
      
      {/* 创建临时配方弹窗 */}
      <Modal
        title="创建临时配方"
        open={createRecipeModalVisible}
        onCancel={() => {
          setCreateRecipeModalVisible(false);
          tempRecipeForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={tempRecipeForm}
          layout="vertical"
          onFinish={handleSubmitTempRecipe}
        >
          <Form.Item
            name="name"
            label="配方名称"
            rules={[{ required: true, message: '请输入配方名称' }]}
          >
            <Input placeholder="请输入配方名称" />
          </Form.Item>
          
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
              placeholder="请输入制作重量"
            />
          </Form.Item>
          
          <Divider>材料配比</Divider>
          
          <Form.List name="materials">
            {(fields, { add, remove }) => {
              const currentTotal = tempRecipeForm.getFieldValue('materials')?.reduce(
                (sum, m) => sum + parseFloat(m?.percentage || 0), 0
              ) || 0;
              
              return (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Tag color={Math.abs(currentTotal - 100) < 0.01 ? 'success' : 'error'}>
                      当前配比总和：{currentTotal.toFixed(2)}%
                    </Tag>
                  </div>
                  
                  {fields.map(({ key, name, ...restField }) => (
                    <Space
                      key={key}
                      style={{ display: 'flex', marginBottom: 8 }}
                      align="baseline"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'productId']}  // 改为 productId
                        rules={[{ required: true, message: '请选择商品' }]}
                      >
                        <Select
                          placeholder="选择商品"
                          style={{ width: 200 }}
                          showSearch
                          optionFilterProp="children"
                        >
                          {recipeProducts.map(p => (  // 使用 recipeProducts
                            <Option key={p.id} value={p.id}>
                              {p.name} (¥{p.price}/{p.unit})
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
                setCreateRecipeModalVisible(false);
                tempRecipeForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                确定并添加到购物车
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