import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '用户名'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码（加密）'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '姓名'
  },
  phone: {
    type: DataTypes.STRING(20),
    comment: '手机号'
  },
  role: {
    type: DataTypes.ENUM('admin', 'staff'),
    defaultValue: 'staff',
    comment: '角色'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    comment: '状态'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    field: 'last_login_at',
    comment: '最后登录时间'
  },
  deletedAt: {
    type: DataTypes.DATE,
    field: 'deleted_at',
    comment: '删除时间（软删除）'
  }
}, {
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// 实例方法
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// 移除密码字段
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

export default User;