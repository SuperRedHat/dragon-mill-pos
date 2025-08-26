import request from '@/utils/request';

// 根据手机号查找会员
export const getMemberByPhone = (phone) => {
  return request.get(`/members/phone/${phone}`);
};

// 获取会员列表
export const getMemberList = (params) => {
  return request.get('/members', { params });
};

// 创建会员
export const createMember = (data) => {
  return request.post('/members', data);
};

// 更新会员信息
export const updateMember = (id, data) => {
  return request.put(`/members/${id}`, data);
};

// 调整积分
export const adjustMemberPoints = (id, data) => {
  return request.post(`/members/${id}/points`, data);
};

// 搜索会员（自动完成）
export const searchMembers = (keyword) => {
  return request.get('/members/search', { params: { keyword } });
};
