import request from '@/utils/request';

// 获取材料列表
export const getMaterialList = (params) => {
  return request.get('/materials', { params });
};

// 创建材料
export const createMaterial = (data) => {
  return request.post('/materials', data);
};

// 更新材料
export const updateMaterial = (id, data) => {
  return request.put(`/materials/${id}`, data);
};

// 删除材料
export const deleteMaterial = (id) => {
  return request.delete(`/materials/${id}`);
};

// 调整材料库存
export const adjustMaterialStock = (id, data) => {
  return request.post(`/materials/${id}/stock`, data);
};