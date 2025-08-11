import request from '@/utils/request';

// 登录
export const login = (data) => {
  return request.post('/auth/login', data);
};

// 获取当前用户信息
export const getCurrentUser = () => {
  return request.get('/auth/me');
};

// 登出
export const logout = () => {
  return request.post('/auth/logout');
};

// 修改密码
export const changePassword = (data) => {
  return request.post('/auth/change-password', data);
};