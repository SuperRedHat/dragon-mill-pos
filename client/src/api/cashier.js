import request from '@/utils/request';

// 获取收银台商品列表（按分类）
export const getCashierProducts = () => {
  return request.get('/cashier/products/available');
};

// 搜索商品
export const searchProducts = (keyword) => {
  return request.get('/cashier/products/search', { params: { keyword } });
};

// 结算
export const checkout = (data) => {
  return request.post('/cashier/checkout', data);
};

// 获取今日统计
export const getTodayStats = () => {
  return request.get('/cashier/today-stats');
};