// 获取完整的头像URL
export const getAvatarUrl = (avatar) => {
  if (!avatar) {
    return null;
  }
  
  // 如果已经是完整URL，直接返回
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  
  // 如果是相对路径，添加服务器地址
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3001';
  
  // 确保路径以 / 开头
  const path = avatar.startsWith('/') ? avatar : `/${avatar}`;
  
  // 添加时间戳防止缓存
  const timestamp = new Date().getTime();
  const separator = path.includes('?') ? '&' : '?';
  
  return `${baseUrl}${path}${separator}t=${timestamp}`;
};

// 从完整URL中提取相对路径
export const getRelativeAvatarPath = (url) => {
  if (!url) {
    return null;
  }
  
  // 移除域名部分
  const match = url.match(/\/uploads\/avatars\/.+/);
  return match ? match[0] : url;
};