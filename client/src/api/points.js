import request from '@/utils/request';

// 获取积分统计
export const getPointsStatistics = () => {
  return request.get('/points/statistics');
};

// 获取积分明细
export const getPointsRecords = (params) => {
  return request.get('/points/records', { params });
};

// 获取积分规则
export const getPointsRules = () => {
  return request.get('/points/rules');
};

// 更新积分规则
export const updatePointsRules = (data) => {
  return request.put('/points/rules', data);
};

// 批量调整积分
export const batchAdjustPoints = (data) => {
  return request.post('/points/batch-adjust', data);
};