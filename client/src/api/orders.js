import request from '@/utils/request';

export const getOrderList = (params) => {
  return request.get('/orders', { params });
};

export const getOrderDetail = (id) => {
  return request.get(`/orders/${id}`);
};

export const refundOrder = (id, data) => {
  return request.post(`/orders/${id}/refund`, data);
};