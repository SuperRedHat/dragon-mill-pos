import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const OperationLog = sequelize.define('OperationLog', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '用户名'
  },
  module: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '模块'
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '操作'
  },
  content: {
    type: DataTypes.TEXT,
    comment: '操作内容'
  },
  ip: {
    type: DataTypes.STRING(50),
    comment: 'IP地址'
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent',
    comment: '用户代理'
  }
}, {
  tableName: 'operation_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

export default OperationLog;