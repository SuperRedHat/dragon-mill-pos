import request from '@/utils/request';

// 获取个人信息
export const getProfile = () => {
  return request.get('/auth/me');
};

// 更新个人信息
export const updateProfile = (data) => {
  return request.put('/profile/update', data);
};

// 修改密码
export const changePassword = (data) => {
  return request.post('/auth/change-password', data);
};

// 获取登录历史
export const getLoginHistory = (params) => {
  return request.get('/profile/login-history', { params });
};

// 获取操作日志
export const getOperationLogs = (params) => {
  return request.get('/profile/operation-logs', { params });
};

// 上传头像
export const uploadAvatar = (formData) => {
  return request.post('/profile/avatar', formData);
};