import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  App,
  Row,
  Col,
  Statistic,
  Alert,
  Divider,
  Badge
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  GiftOutlined,
  RiseOutlined,
  FallOutlined,
  SwapOutlined,
  ExportOutlined
} from '@ant-design/icons';
import ReactEcharts from 'echarts-for-react';
import dayjs from 'dayjs';
import request from '@/utils/request';
import './index.scss';

const { RangePicker } = DatePicker;

const PointsManagement = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 积分统计数据
  const [statistics, setStatistics] = useState({
    overview: {
      totalPoints: 0,
      averagePoints: 0,
      monthlyEarned: 0,
      monthlyUsed: 0
    },
    distribution: []
  });
  
  // 积分明细
  const [records, setRecords] = useState([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState(10);
  const [recordsSearchParams, setRecordsSearchParams] = useState({});
  
  // 积分规则
  const [rules, setRules] = useState({
    earnRate: 1,
    useRate: 100,
    maxUsePercent: 30,
    expireMonths: 12,
    birthdayMultiple: 2
  });
  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  
  const [searchForm] = Form.useForm();
  const [rulesForm] = Form.useForm();
  const { message, modal } = App.useApp();

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin';

  // 获取积分统计
  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const res = await request.get('/points/statistics');
      if (res.success) {
        setStatistics(res.data);
      }
    } catch (error) {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取积分明细
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await request.get('/points/records', {
        params: {
          page: recordsPage,
          pageSize: recordsPageSize,
          ...recordsSearchParams
        }
      });
      if (res.success) {
        setRecords(res.data.list);
        setRecordsTotal(res.data.total);
      }
    } catch (error) {
      message.error('获取积分明细失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取积分规则
  const fetchRules = async () => {
    try {
      const res = await request.get('/points/rules');
      if (res.success) {
        setRules(res.data);
      }
    } catch (error) {
      message.error('获取积分规则失败');
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStatistics();
      fetchRules();
    } else if (activeTab === 'records') {
      fetchRecords();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'records') {
      fetchRecords();
    }
  }, [recordsPage, recordsPageSize, recordsSearchParams]);

  // 搜索积分记录
  const handleSearchRecords = (values) => {
    const params = {};
    
    if (values.memberKeyword) {
      params.memberKeyword = values.memberKeyword;
    }
    
    if (values.type) {
      params.type = values.type;
    }
    
    if (values.dateRange) {
      params.startDate = values.dateRange[0].format('YYYY-MM-DD');
      params.endDate = values.dateRange[1].format('YYYY-MM-DD');
    }
    
    setRecordsSearchParams(params);
    setRecordsPage(1);
  };

  // 重置搜索
  const handleResetSearch = () => {
    searchForm.resetFields();
    setRecordsSearchParams({});
    setRecordsPage(1);
  };

  // 更新积分规则
  const handleUpdateRules = async (values) => {
    if (!isAdmin) {
      message.warning('只有管理员可以修改积分规则');
      return;
    }
    
    modal.confirm({
      title: '确认修改',
      content: '修改积分规则将影响后续的积分计算，确定要修改吗？',
      onOk: async () => {
        try {
          const res = await request.put('/points/rules', values);
          if (res.success) {
            message.success('积分规则更新成功');
            setRules(values);
            setRulesModalVisible(false);
            rulesForm.resetFields();
          }
        } catch (error) {
          message.error('更新积分规则失败');
        }
      }
    });
  };

  // 积分分布图表配置
  const getDistributionChart = () => {
    const data = statistics.distribution || [];
    
    return {
      title: {
        show: false  // 隐藏标题，因为已经有了
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '3%',
        top: '5%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.range_label),
        axisLabel: {
          rotate: 0,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        name: '会员数',
        nameTextStyle: {
          fontSize: 11
        },
        axisLabel: {
          fontSize: 11
        }
      },
      series: [{
        name: '会员数',
        type: 'bar',
        data: data.map(item => item.member_count),
        itemStyle: {
          color: '#1890ff'
        },
        barMaxWidth: 40
      }]
    };
  };

  // 积分明细表格列
  const recordColumns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180
    },
    {
      title: '会员',
      dataIndex: 'member',
      key: 'member',
      width: 150,
      render: (member) => member ? (
        <div>
          <div>{member.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{member.phone}</div>
        </div>
      ) : '-'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => (
        <Tag color={type === 'earn' ? 'success' : 'warning'}>
          {type === 'earn' ? '获得' : '使用'}
        </Tag>
      )
    },
    {
      title: '积分变动',
      dataIndex: 'points',
      key: 'points',
      width: 100,
      render: (points) => (
        <span style={{ 
          color: points > 0 ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold' 
        }}>
          {points > 0 ? '+' : ''}{points}
        </span>
      )
    },
    {
      title: '说明',
      dataIndex: 'reason',
      key: 'reason',
      width: 200
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    }
  ];

  return (
    <div className="points-management-page">
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: <span><GiftOutlined /> 积分概览</span>,
              children: (
                <>
                  {/* 积分规则卡片 */}
                  <div style={{ 
                    marginBottom: 16, 
                    padding: '10px 16px', 
                    background: '#fafafa', 
                    borderRadius: '4px',
                    border: '1px solid #f0f0f0'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: 8 
                    }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>积分规则</span>
                      {isAdmin && (
                        <Button
                          size="small"
                          type="link"
                          icon={<SettingOutlined />}
                          onClick={() => {
                            setRulesModalVisible(true);
                            rulesForm.setFieldsValue(rules);
                          }}
                        >
                          修改规则
                        </Button>
                      )}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '24px', 
                      flexWrap: 'wrap',
                      fontSize: '13px'
                    }}>
                      <span>
                        <span style={{ color: '#666' }}>消费积分：</span>
                        <span style={{ fontWeight: 'bold', color: '#1890ff', margin: '0 4px' }}>
                          ¥1 = {rules.earnRate}分
                        </span>
                      </span>
                      <span>
                        <span style={{ color: '#666' }}>积分抵扣：</span>
                        <span style={{ fontWeight: 'bold', color: '#1890ff', margin: '0 4px' }}>
                          {rules.useRate}分 = ¥1
                        </span>
                      </span>
                      <span>
                        <span style={{ color: '#666' }}>最高抵扣：</span>
                        <span style={{ fontWeight: 'bold', color: '#1890ff', margin: '0 4px' }}>
                          {rules.maxUsePercent}%
                        </span>
                      </span>
                      <span>
                        <span style={{ color: '#666' }}>有效期：</span>
                        <span style={{ fontWeight: 'bold', color: '#1890ff', margin: '0 4px' }}>
                          {rules.expireMonths}个月
                        </span>
                      </span>
                      <span>
                        <span style={{ color: '#666' }}>生日特权：</span>
                        <span style={{ fontWeight: 'bold', color: '#1890ff', margin: '0 4px' }}>
                          {rules.birthdayMultiple}倍
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* 统计数据 - 保持之前的紧凑版 */}
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <div className="stat-card">
                        <div className="stat-content">
                          <div className="stat-title">积分总量</div>
                          <div className="stat-value">
                            <GiftOutlined className="stat-icon" />
                            <span>{statistics.overview.totalPoints.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="stat-card">
                        <div className="stat-content">
                          <div className="stat-title">人均积分</div>
                          <div className="stat-value">
                            <SwapOutlined className="stat-icon" />
                            <span>{statistics.overview.averagePoints.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="stat-card stat-success">
                        <div className="stat-content">
                          <div className="stat-title">本月发放</div>
                          <div className="stat-value">
                            <RiseOutlined className="stat-icon" />
                            <span>{statistics.overview.monthlyEarned.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="stat-card stat-error">
                        <div className="stat-content">
                          <div className="stat-title">本月使用</div>
                          <div className="stat-value">
                            <FallOutlined className="stat-icon" />
                            <span>{statistics.overview.monthlyUsed.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {/* 分布图表 - 紧凑版 */}
                  <div style={{ 
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                    padding: '12px'
                  }}>
                    <div style={{ 
                      marginBottom: '8px', 
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      积分分布
                    </div>
                    <ReactEcharts 
                      option={getDistributionChart()} 
                      style={{ height: 200 }}  // 降低高度
                      showLoading={loading}
                    />
                  </div>
                </>
              )
            },
            {
              key: 'records',
              label: <span><Badge count={recordsTotal} offset={[10, 0]}>积分明细</Badge></span>,
              children: (
                <>
                  {/* 搜索表单 */}
                  <Form
                    form={searchForm}
                    layout="inline"
                    onFinish={handleSearchRecords}
                    style={{ marginBottom: 16 }}
                  >
                    <Form.Item name="memberKeyword">
                      <Input
                        placeholder="会员姓名/手机号"
                        prefix={<SearchOutlined />}
                        allowClear
                        style={{ width: 180 }}
                      />
                    </Form.Item>
                    
                    <Form.Item name="type">
                      <Select
                        placeholder="变动类型"
                        allowClear
                        style={{ width: 120 }}
                      >
                        <Select.Option value="earn">获得</Select.Option>
                        <Select.Option value="use">使用</Select.Option>
                      </Select>
                    </Form.Item>
                    
                    <Form.Item name="dateRange">
                      <RangePicker 
                        placeholder={['开始日期', '结束日期']}
                        style={{ width: 240 }}
                      />
                    </Form.Item>
                    
                    <Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                          查询
                        </Button>
                        <Button onClick={handleResetSearch} icon={<ReloadOutlined />}>
                          重置
                        </Button>
                        <Button icon={<ExportOutlined />}>
                          导出
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>

                  {/* 积分明细表格 */}
                  <Table
                    loading={loading}
                    columns={recordColumns}
                    dataSource={records}
                    rowKey="id"
                    pagination={{
                      current: recordsPage,
                      pageSize: recordsPageSize,
                      total: recordsTotal,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条`,
                      onChange: (page, size) => {
                        setRecordsPage(page);
                        setRecordsPageSize(size);
                      }
                    }}
                  />
                </>
              )
            }
          ]}
        />
      </Card>

      {/* 积分规则设置弹窗 */}
      <Modal
        title="积分规则设置"
        open={rulesModalVisible}
        onCancel={() => {
          setRulesModalVisible(false);
          rulesForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Alert
          message="修改积分规则将影响后续的积分计算，请谨慎操作"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={rulesForm}
          layout="vertical"
          onFinish={handleUpdateRules}
        >
          <Form.Item
            name="earnRate"
            label="消费积分比例"
            rules={[{ required: true, message: '请输入消费积分比例' }]}
            extra="消费1元获得多少积分"
          >
            <InputNumber min={0.1} max={10} step={0.1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="useRate"
            label="积分抵扣比例"
            rules={[{ required: true, message: '请输入积分抵扣比例' }]}
            extra="多少积分可以抵扣1元"
          >
            <InputNumber min={1} max={1000} step={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="maxUsePercent"
            label="最高抵扣比例(%)"
            rules={[{ required: true, message: '请输入最高抵扣比例' }]}
            extra="积分最多可抵扣订单金额的百分比"
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="expireMonths"
            label="积分有效期(月)"
            rules={[{ required: true, message: '请输入积分有效期' }]}
            extra="积分多少个月后过期，0表示永不过期"
          >
            <InputNumber min={0} max={120} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="birthdayMultiple"
            label="生日积分倍数"
            rules={[{ required: true, message: '请输入生日积分倍数' }]}
            extra="会员生日当天消费获得积分的倍数"
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setRulesModalVisible(false);
                rulesForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存设置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PointsManagement;