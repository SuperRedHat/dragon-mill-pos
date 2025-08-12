import request from '@/utils/request';

// 获取商品列表
export const getProductList = (params) => {
  return request.get('/products', { params });
};

// 获取单个商品信息
export const getProductById = (id) => {
  return request.get(`/products/${id}`);
};

// 创建商品
export const createProduct = (data) => {
  return request.post('/products', data);
};

// 更新商品
export const updateProduct = (id, data) => {
  return request.put(`/products/${id}`, data);
};

// 删除商品
export const deleteProduct = (id) => {
  return request.delete(`/products/${id}`);
};

// 上传商品图片
export const uploadProductImage = (id, formData) => {
  return request.post(`/products/${id}/image`, formData);
};

// 调整库存
export const adjustStock = (id, data) => {
  return request.post(`/products/${id}/stock`, data);
};

// 获取库存记录
export const getStockRecords = (id, params) => {
  return request.get(`/products/${id}/stock-records`, { params });
};

// 批量补货
export const batchReplenish = (data) => {
  return request.post('/products/batch-replenish', data);
};

// 获取补货建议
export const getReplenishSuggestions = () => {
  return request.get('/products/replenish-suggestions');
};