import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import Router from './routes';
import messageManager from './utils/messageManager';

function App() {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    // 初始化消息管理器
    messageManager.setMessageApi(message);
  }, [message]);

  return (
    <BrowserRouter 
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Router />
    </BrowserRouter>
  );
}

function AppWrapper() {
  return (
    <AntdApp>
      <App />
    </AntdApp>
  );
}

export default AppWrapper;