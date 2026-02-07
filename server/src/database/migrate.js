import 'dotenv/config';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Helper: check if a column exists via information_schema (truly idempotent)
// ---------------------------------------------------------------------------
const columnExists = async (table, column) => {
  const [row] = await sequelize.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column], type: QueryTypes.SELECT }
  );
  return !!row;
};

const tableExists = async (table) => {
  const [row] = await sequelize.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [table], type: QueryTypes.SELECT }
  );
  return !!row;
};

// ---------------------------------------------------------------------------
// Helper: add a column only if missing, with clear logging
// ---------------------------------------------------------------------------
const ensureColumn = async (table, column, definition) => {
  if (await columnExists(table, column)) {
    logger.info(`  [skip] ${table}.${column} — 已存在`);
    return false;
  }
  const qi = sequelize.getQueryInterface();
  await qi.addColumn(table, column, definition);
  logger.info(`  [add]  ${table}.${column} — 已添加`);
  return true;
};

// ---------------------------------------------------------------------------
// Migration stamp table — tracks which migrations have run
// ---------------------------------------------------------------------------
const ensureMigrationTable = async () => {
  if (await tableExists('_migrations')) return;
  await sequelize.query(`
    CREATE TABLE _migrations (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      name      VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info('[migrations] 创建 _migrations 追踪表');
};

const isMigrationApplied = async (name) => {
  const [row] = await sequelize.query(
    'SELECT id FROM _migrations WHERE name = ?',
    { replacements: [name], type: QueryTypes.SELECT }
  );
  return !!row;
};

const stampMigration = async (name) => {
  await sequelize.query(
    'INSERT INTO _migrations (name) VALUES (?)',
    { replacements: [name] }
  );
};

// ===========================================================================
// Migration: 001_add_recipe_fields
// ===========================================================================
const migration001 = async () => {
  const NAME = '001_add_recipe_fields';
  if (await isMigrationApplied(NAME)) {
    logger.info(`[${NAME}] 已执行过，跳过`);
    return;
  }

  logger.info(`[${NAME}] 开始执行...`);

  // order_items — 配方字段
  await ensureColumn('order_items', 'is_recipe', {
    type: 'TINYINT(1)',
    defaultValue: 0,
    allowNull: false,
    comment: '是否为配方项'
  });
  await ensureColumn('order_items', 'recipe_details', {
    type: 'JSON',
    defaultValue: null,
    comment: '配方详情（材料明细等）'
  });
  await ensureColumn('order_items', 'recipe_id', {
    type: 'BIGINT',
    defaultValue: null,
    comment: '配方ID（如果是配方项）'
  });

  // recipes — 使用统计字段
  await ensureColumn('recipes', 'last_used_at', {
    type: 'DATETIME',
    defaultValue: null,
    comment: '最后使用时间'
  });
  await ensureColumn('recipes', 'last_weight', {
    type: 'DECIMAL(10,2)',
    defaultValue: 100,
    comment: '最后使用重量'
  });

  // recipe_usage_logs 表
  if (!(await tableExists('recipe_usage_logs'))) {
    const qi = sequelize.getQueryInterface();
    await qi.createTable('recipe_usage_logs', {
      id: { type: 'BIGINT', primaryKey: true, autoIncrement: true },
      recipe_id: { type: 'INTEGER', allowNull: false, comment: '配方ID' },
      order_id: { type: 'BIGINT', allowNull: false, comment: '订单ID' },
      member_id: { type: 'INTEGER', comment: '会员ID' },
      weight: { type: 'DECIMAL(10,2)', allowNull: false, comment: '使用重量' },
      price: { type: 'DECIMAL(10,2)', allowNull: false, comment: '价格' },
      created_at: { type: 'DATETIME', defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await qi.addIndex('recipe_usage_logs', ['recipe_id']);
    await qi.addIndex('recipe_usage_logs', ['member_id']);
    await qi.addIndex('recipe_usage_logs', ['created_at']);
    logger.info('  [create] recipe_usage_logs 表已创建');
  } else {
    logger.info('  [skip]   recipe_usage_logs 表已存在');
  }

  await stampMigration(NAME);
  logger.info(`[${NAME}] 完成`);
};

// ===========================================================================
// Runner
// ===========================================================================
const migrate = async () => {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功，开始执行迁移...');

    await ensureMigrationTable();

    // Register all migrations here in order
    await migration001();
    // Future: await migration002();

    logger.info('所有迁移执行完成');
    process.exit(0);
  } catch (error) {
    logger.error('迁移执行失败:', error);
    process.exit(1);
  }
};

// Export helpers for startup schema check
export { columnExists };

migrate();
