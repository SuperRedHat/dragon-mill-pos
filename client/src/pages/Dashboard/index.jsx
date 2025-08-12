import React from 'react';
import { Row, Col, Card, Statistic, Table, Progress, App } from 'antd';
import {
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import './index.scss';

const Dashboard = () => {
  // 使用 App.useApp 获取 message
  const { message } = App.useApp();

  // 模拟数据
  const todayStats = {
    sales: 12580.50,
    orders: 86,
    members: 12,
    average: 146.28,
  };

  const salesTrend = {
    value: 12580.50,
    lastValue: 10230.20,
    rate: 23,
    isUp: true,
  };

  // 热销商品
  const hotProducts = [
    { key: 1, name: '五谷杂粮粉', sales: 156, amount: 4680 },
    { key: 2, name: '黑芝麻糊', sales: 98, amount: 2940 },
    { key: 3, name: '红豆薏米粉', sales: 87, amount: 2610 },
    { key: 4, name: '核桃粉', sales: 76, amount: 3040 },
    { key: 5, name: '营养早餐粉', sales: 65, amount: 1950 },
  ];

  const columns = [
    {
      title: '排名',
      dataIndex: 'key',
      key: 'key',
      width: 60,
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '销量',
      dataIndex: 'sales',
      key: 'sales',
    },
    {
      title: '销售额',
      dataIndex: 'amount',
      key: 'amount',
      render: (value) => `¥${value.toFixed(2)}`,
    },
  ];

  return (
    <div className="dashboard">
      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="今日销售额"
              value={todayStats.sales}
              precision={2}
              prefix="¥"
              suffix={
                <span style={{ fontSize: 14, marginLeft: 8 }}>
                  <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  <span style={{ color: '#52c41a' }}> {salesTrend.rate}%</span>
                </span>
              }
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="今日订单"
              value={todayStats.orders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="新增会员"
              value={todayStats.members}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="客单价"
              value={todayStats.average}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表和列表 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} md={16}>
          <Card title="销售趋势">
            <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#999' }}>图表功能开发中...</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="今日热销商品">
            <Table
              columns={columns}
              dataSource={hotProducts}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* 其他信息 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="收银员业绩">
            <div className="staff-performance">
              <div className="staff-item">
                <span>张三</span>
                <span>¥5,230.00</span>
                <Progress percent={42} size="small" />
              </div>
              <div className="staff-item">
                <span>李四</span>
                <span>¥4,350.50</span>
                <Progress percent={35} size="small" />
              </div>
              <div className="staff-item">
                <span>王五</span>
                <span>¥3,000.00</span>
                <Progress percent={23} size="small" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="库存预警">
            <div className="inventory-alert">
              <div className="alert-item">
                <span className="product">核桃仁</span>
                <span className="stock danger">仅剩 2kg</span>
              </div>
              <div className="alert-item">
                <span className="product">黑芝麻</span>
                <span className="stock warning">仅剩 5kg</span>
              </div>
              <div className="alert-item">
                <span className="product">红豆</span>
                <span className="stock warning">仅剩 8kg</span>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="待办事项">
            <div className="todo-list">
              <div className="todo-item">
                <span className="dot"></span>
                <span>3个订单待处理</span>
              </div>
              <div className="todo-item">
                <span className="dot"></span>
                <span>5个商品需要补货</span>
              </div>
              <div className="todo-item">
                <span className="dot"></span>
                <span>2个会员生日提醒</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;