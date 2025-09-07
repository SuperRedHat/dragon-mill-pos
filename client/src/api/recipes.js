import request from '@/utils/request';

// 获取配方列表
export const getRecipeList = (params) => {
  return request.get('/recipes', { params });
};

// 创建配方
export const createRecipe = (data) => {
  return request.post('/recipes', data);
};

// 更新配方
export const updateRecipe = (id, data) => {
  return request.put(`/recipes/${id}`, data);
};

// 删除配方
export const deleteRecipe = (id) => {
  return request.delete(`/recipes/${id}`);
};

// 复制配方
export const copyRecipe = (id, data) => {
  return request.post(`/recipes/${id}/copy`, data);
};

// 计算配方价格
export const calculateRecipePrice = (id, weight) => {
  return request.post(`/recipes/${id}/calculate-price`, { weight });
};

// 获取收银用配方
export const getRecipesForSale = (memberId) => {
  return request.get('/cashier/recipes/for-sale', { 
    params: { memberId } 
  });
};

// 计算配方价格（收银用）
export const calculateRecipeForCashier = (data) => {
  return request.post('/cashier/recipes/calculate', data);
};