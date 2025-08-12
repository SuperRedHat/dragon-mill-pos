import request from '@/utils/request';

// 获取分类列表
export const getCategoryList = (params) => {
  return request.get('/product-categories', { params });
};

// 创建分类
export const createCategory = (data) => {
  return request.post('/product-categories', data);
};

// 更新分类
export const updateCategory = (id, data) => {
  return request.put(`/product-categories/${id}`, data);
};

// 删除分类
export const deleteCategory = (id) => {
  return request.delete(`/product-categories/${id}`);
};