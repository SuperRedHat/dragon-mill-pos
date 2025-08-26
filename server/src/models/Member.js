import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Member = sequelize.define('Member', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  memberNo: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false,
    field: 'member_no',
    comment: '会员号'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '姓名'
  },
  phone: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false,
    comment: '手机号'
  },
  birthday: {
    type: DataTypes.DATEONLY,
    comment: '生日'
  },
  email: {
    type: DataTypes.STRING(100),
    comment: '邮箱',
    validate: {
      isEmail: true
    }
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '积分'
  },
  totalConsumption: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'total_consumption',
    comment: '累计消费',
    get() {
      const value = this.getDataValue('totalConsumption');
      return value ? parseFloat(value) : 0;
    }
  },
  joinDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    field: 'join_date',
    comment: '入会日期'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    comment: '状态'
  },
  remark: {
    type: DataTypes.TEXT,
    comment: '备注'
  }
}, {
  tableName: 'members',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (member) => {
      // 生成会员号
      if (!member.memberNo) {
        const count = await Member.count();
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const sequence = (count + 1).toString().padStart(5, '0');
        member.memberNo = `M${year}${month}${sequence}`;
      }
    }
  }
});

export default Member;