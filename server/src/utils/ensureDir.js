import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ensureDir = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`创建目录: ${dirPath}`);
    } else {
      logger.info(`目录已存在: ${dirPath}`);
    }
    
    // 检查目录是否可写
    fs.accessSync(dirPath, fs.constants.W_OK);
    return true;
  } catch (error) {
    logger.error(`目录创建/访问失败: ${dirPath}`, error);
    throw error;
  }
};

// 确保上传目录存在
export const ensureUploadDirs = () => {
  const projectRoot = path.join(__dirname, '../..');
  const uploadsDir = path.join(projectRoot, 'uploads');
  const avatarsDir = path.join(uploadsDir, 'avatars');
  
  logger.info('检查上传目录...');
  logger.info(`项目根目录: ${projectRoot}`);
  logger.info(`上传目录: ${uploadsDir}`);
  logger.info(`头像目录: ${avatarsDir}`);
  
  try {
    ensureDir(uploadsDir);
    ensureDir(avatarsDir);
    
    logger.info('上传目录检查完成');
    
    return {
      uploadsDir,
      avatarsDir
    };
  } catch (error) {
    logger.error('创建上传目录失败:', error);
    // 尝试使用临时目录
    const tempDir = path.join(process.cwd(), 'temp_uploads');
    const tempAvatarsDir = path.join(tempDir, 'avatars');
    
    logger.info(`尝试使用临时目录: ${tempDir}`);
    ensureDir(tempDir);
    ensureDir(tempAvatarsDir);
    
    return {
      uploadsDir: tempDir,
      avatarsDir: tempAvatarsDir
    };
  }
};