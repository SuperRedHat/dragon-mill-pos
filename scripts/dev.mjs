#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('🚀 启动开发服务器...');
console.log('📁 项目根目录:', rootDir);

// 启动后端服务
console.log('📦 启动后端服务...');
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: join(rootDir, 'server'),
  stdio: 'inherit',
  shell: true
});

// 延迟启动前端，避免同时启动造成卡顿
setTimeout(() => {
  console.log('🎨 启动前端服务...');
  const clientProcess = spawn('npm', ['run', 'dev'], {
    cwd: join(rootDir, 'client'),
    stdio: 'inherit',
    shell: true
  });

  // 错误处理
  clientProcess.on('error', (err) => {
    console.error('❌ 前端启动失败:', err);
  });

  // 优雅退出
  const cleanup = () => {
    console.log('\n👋 正在关闭服务...');
    serverProcess.kill();
    clientProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}, 3000); // 延迟3秒启动前端

// 错误处理
serverProcess.on('error', (err) => {
  console.error('❌ 后端启动失败:', err);
  process.exit(1);
});