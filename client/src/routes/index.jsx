import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';

// 布局组件
import MainLayout from '@/layouts/MainLayout';

// 懒加载页面组件
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const UserManagement = lazy(() => import('@/pages/Settings/Users'));
const Profile = lazy(() => import('@/pages/Profile'));
const ProductCategories = lazy(() => import('@/pages/Products/Categories'));
const ProductList = lazy(() => import('@/pages/Products/List'));
const InventoryManagement = lazy(() => import('@/pages/Products/Inventory'));

// 全局加载组件
const PageLoading = () => (
  <div style={{ 
    height: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  }}>
    <Spin size="large" />
  </div>
);

// 404 页面
const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <Result
      status="404"
      title="404"
      subTitle="抱歉，您访问的页面不存在"
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          返回首页
        </Button>
      }
    />
  );
};

// 开发中页面
const ComingSoon = ({ title }) => {
  return (
    <Result
      icon={<div style={{ fontSize: 64 }}>🚧</div>}
      title={title || "功能开发中"}
      subTitle="该功能正在开发中，敬请期待..."
    />
  );
};

// 路由守卫
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// 公开路由（已登录用户访问时重定向到首页）
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

const Router = () => {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* 根路径重定向 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 登录页面 */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* 主布局 */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* 仪表盘 */}
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* 收银台 */}
          <Route path="cashier" element={<ComingSoon title="收银台" />} />
          
          {/* 会员管理 */}
          <Route path="members">
            <Route path="list" element={<ComingSoon title="会员列表" />} />
            <Route path="points" element={<ComingSoon title="积分管理" />} />
          </Route>
          
          {/* 商品管理 */}
          <Route path="products">
            <Route path="list" element={<ProductList />} />
            <Route path="categories" element={<ProductCategories />} />
            <Route path="inventory" element={<InventoryManagement />} />
          </Route>
          
          {/* 配方管理 */}
          <Route path="recipes">
            <Route path="materials" element={<ComingSoon title="原材料管理" />} />
            <Route path="list" element={<ComingSoon title="配方列表" />} />
            <Route path="service" element={<ComingSoon title="磨粉服务" />} />
          </Route>
          
          {/* 报表中心 */}
          <Route path="reports">
            <Route path="sales" element={<ComingSoon title="营收报表" />} />
            <Route path="products" element={<ComingSoon title="商品分析" />} />
            <Route path="members" element={<ComingSoon title="会员分析" />} />
          </Route>
          
          {/* 系统设置 */}
          <Route path="settings">
            <Route path="users" element={<UserManagement />} />
            <Route path="shop" element={<ComingSoon title="店铺设置" />} />
            <Route path="system" element={<ComingSoon title="系统配置" />} />
          </Route>
          
          {/* 个人中心 */}
          <Route path="profile" element={<Profile />} />
        </Route>
        
        {/* 404 页面 */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
};

export default Router;