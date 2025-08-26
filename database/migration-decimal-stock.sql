-- 支持小数库存的迁移脚本
USE dragon_mill_pos;

-- 修改库存相关字段为DECIMAL类型
ALTER TABLE products 
  MODIFY COLUMN stock DECIMAL(10, 2) DEFAULT 0,
  MODIFY COLUMN min_stock DECIMAL(10, 2) DEFAULT 0,
  MODIFY COLUMN max_stock DECIMAL(10, 2) DEFAULT 1000;

ALTER TABLE stock_records
  MODIFY COLUMN quantity DECIMAL(10, 2) NOT NULL,
  MODIFY COLUMN before_stock DECIMAL(10, 2),
  MODIFY COLUMN after_stock DECIMAL(10, 2);

ALTER TABLE order_items
  MODIFY COLUMN quantity DECIMAL(10, 2) NOT NULL;