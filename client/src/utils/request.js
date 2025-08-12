import axios from 'axios';
import messageManager from './messageManager';

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
  timeout: import.meta.env.VITE_API_TIMEOUT || 30000,
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401) {
        messageManager.error('登录已过期，请重新登录');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (status === 403) {
        messageManager.error('没有权限访问');
      } else if (status === 404) {
        messageManager.error('请求的资源不存在');
      } else if (status === 500) {
        messageManager.error(data.error || '服务器错误');
      } else {
        messageManager.error(data.error || '请求失败');
      }
    } else if (error.request) {
      messageManager.error('网络错误，请检查网络连接');
    } else {
      messageManager.error('请求失败');
    }
    
    return Promise.reject(error);
  }
);

export default request;