import request from '@/utils/request';

// 获取用户列表
export const getUserList = (params) => {
  return request.get('/users', { params });
};

// 获取单个用户信息
export const getUserById = (id) => {
  return request.get(`/users/${id}`);
};

// 创建用户
export const createUser = (data) => {
  return request.post('/users', data);
};

// 更新用户信息
export const updateUser = (id, data) => {
  return request.put(`/users/${id}`, data);
};

// 重置用户密码
export const resetPassword = (id, password) => {
  return request.post(`/users/${id}/reset-password`, { password });
};

// 删除用户（软删除）
export const deleteUser = (id) => {
  return request.delete(`/users/${id}`);
};

// 恢复已删除的用户
export const restoreUser = (id) => {
  return request.post(`/users/${id}/restore`);
};

// 获取已删除的用户列表
export const getDeletedUsers = () => {
  return request.get('/users/deleted/list');
};

// 获取用户操作日志
export const getUserLogs = (id, params) => {
  return request.get(`/users/${id}/logs`, { params });
};