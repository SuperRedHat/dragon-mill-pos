-- =====================================
-- 神龙磨坊完整测试数据
-- =====================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0; -- 暂时禁用外键检查

USE dragon_mill_pos;

-- 1. 清空所有数据
TRUNCATE TABLE stock_records;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE products;
TRUNCATE TABLE members;
DELETE FROM product_categories WHERE id > 0;

-- 2. 重置自增ID
ALTER TABLE product_categories AUTO_INCREMENT = 1;
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE members AUTO_INCREMENT = 1;
ALTER TABLE stock_records AUTO_INCREMENT = 1;

-- 3. 插入商品分类
INSERT INTO product_categories (id, name, description, sort_order, status) VALUES
(1, '五谷杂粮', '各类五谷杂粮及其制品', 1, 'active'),
(2, '养生粉类', '各种养生保健粉类产品', 2, 'active'),
(3, '坚果炒货', '各类坚果和炒货制品', 3, 'active'),
(4, '调味香料', '各种调味品和香料', 4, 'active'),
(5, '其他商品', '其他商品分类', 99, 'active');

-- 4. 插入商品数据
INSERT INTO products (category_id, name, short_name, barcode, unit, price, cost, member_price, stock, min_stock, max_stock, status) VALUES
-- 五谷杂粮（缺货、库存不足、正常、充足各种状态）
(1, '有机小米', '小米', '6901234560001', '斤', 18.00, 12.00, 16.50, 0, 20, 100, 'on_sale'),
(1, '东北大米', '大米', '6901234560002', '斤', 12.00, 8.00, 11.00, 0, 30, 150, 'on_sale'),
(1, '糯米', '糯米', '6901234560003', '斤', 15.00, 10.00, 14.00, 5, 20, 100, 'on_sale'),
(1, '黑米', '黑米', '6901234560004', '斤', 22.00, 15.00, 20.00, 8, 15, 80, 'on_sale'),
(1, '红米', '红米', '6901234560005', '斤', 20.00, 14.00, 18.50, 10, 20, 100, 'on_sale'),
(1, '燕麦米', '燕麦', '6901234560006', '斤', 25.00, 18.00, 23.00, 45, 20, 100, 'on_sale'),
(1, '荞麦', '荞麦', '6901234560007', '斤', 28.00, 20.00, 26.00, 55, 30, 120, 'on_sale'),
(1, '薏米仁', '薏米', '6901234560010', '斤', 35.00, 25.00, 32.00, 120, 30, 120, 'on_sale'),

-- 养生粉类
(2, '山药粉', '山药粉', '6901234561001', '包', 45.00, 30.00, 42.00, 0, 10, 50, 'on_sale'),
(2, '葛根粉', '葛根粉', '6901234561002', '包', 38.00, 25.00, 35.00, 0, 15, 60, 'on_sale'),
(2, '莲子粉', '莲子粉', '6901234561003', '包', 48.00, 32.00, 45.00, 3, 10, 40, 'on_sale'),
(2, '枸杞粉', '枸杞粉', '6901234561006', '包', 65.00, 45.00, 60.00, 25, 10, 50, 'on_sale'),
(2, '红枣粉', '红枣粉', '6901234561007', '包', 35.00, 23.00, 32.00, 30, 15, 60, 'on_sale'),
(2, '养生粉', '养生粉', '6901234561010', '包', 58.00, 40.00, 55.00, 80, 20, 80, 'on_sale'),

-- 坚果炒货
(3, '夏威夷果', '夏威夷', '6901234562001', '斤', 120.00, 90.00, 115.00, 0, 5, 30, 'on_sale'),
(3, '开心果', '开心果', '6901234562004', '斤', 95.00, 70.00, 90.00, 4, 10, 35, 'on_sale'),
(3, '核桃仁', '核桃', '6901234562006', '斤', 75.00, 55.00, 70.00, 18, 10, 40, 'on_sale'),
(3, '花生仁', '花生', '6901234562009', '斤', 18.00, 12.00, 16.50, 45, 20, 80, 'on_sale'),
(3, '瓜子仁', '瓜子', '6901234562010', '斤', 22.00, 15.00, 20.00, 100, 30, 100, 'on_sale'),

-- 调味香料
(4, '藏红花', '藏红花', '6901234563001', '克', 88.00, 68.00, 85.00, 0, 50, 200, 'on_sale'),
(4, '肉桂粉', '肉桂', '6901234563002', '斤', 45.00, 32.00, 42.00, 3, 10, 40, 'on_sale'),
(4, '花椒粉', '花椒', '6901234563004', '斤', 55.00, 40.00, 52.00, 25, 10, 40, 'on_sale'),
(4, '五香粉', '五香', '6901234563007', '斤', 35.00, 25.00, 32.00, 30, 15, 50, 'on_sale'),
(4, '辣椒粉', '辣椒', '6901234563008', '斤', 28.00, 18.00, 26.00, 60, 20, 60, 'on_sale'),

-- 其他商品
(5, '木糖醇', '木糖醇', '6901234564001', '包', 25.00, 18.00, 23.00, 0, 20, 80, 'on_sale'),
(5, '蜂蜜', '蜂蜜', '6901234564002', '瓶', 68.00, 50.00, 65.00, 3, 10, 40, 'on_sale'),
(5, '红糖', '红糖', '6901234564005', '包', 10.00, 6.00, 9.00, 45, 30, 100, 'on_sale'),
(5, '奶粉', '奶粉', '6901234564008', '包', 45.00, 32.00, 42.00, 90, 30, 90, 'on_sale'),
(5, '豆奶粉', '豆奶', '6901234564009', '包', 22.00, 15.00, 20.00, 120, 40, 120, 'on_sale');

-- 5. 插入新会员（避免与现有数据冲突）
INSERT IGNORE INTO members (member_no, name, phone, birthday, email, points, total_consumption, join_date, status) VALUES
('M20240011', '测试会员一', '13900139001', '1990-01-01', 'test1@test.com', 500, 1000.00, '2024-01-01', 'active'),
('M20240012', '测试会员二', '13900139002', '1991-02-02', 'test2@test.com', 1000, 2000.00, '2024-01-02', 'active'),
('M20240013', '测试会员三', '13900139003', '1992-03-03', NULL, 1500, 3000.00, '2024-01-03', 'active'),
('M20240014', '测试会员四', '13900139004', '1993-04-04', 'test4@test.com', 2000, 4000.00, '2024-01-04', 'active'),
('M20240015', '测试会员五', '13900139005', '1994-05-05', NULL, 100, 200.00, '2024-01-05', 'active');

-- 6. 插入库存记录
INSERT INTO stock_records (product_id, type, quantity, before_stock, after_stock, remark, operator_id, operator_name) VALUES
(1, 'purchase', 50, 0, 50, 'Initial', 1, 'Admin'),
(1, 'sale', -30, 50, 20, 'Sale', 1, 'Admin'),
(1, 'sale', -20, 20, 0, 'Sold out', 1, 'Admin');

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 7. 显示导入结果
SELECT '===== Import Results =====' as Result;
SELECT COUNT(*) as 'Total Categories' FROM product_categories;
SELECT COUNT(*) as 'Total Products' FROM products WHERE status = 'on_sale';
SELECT COUNT(*) as 'Total Members' FROM members WHERE status = 'active';

SELECT '===== Stock Status Distribution =====' as Result;
SELECT 
    COUNT(CASE WHEN stock = 0 THEN 1 END) as 'Out of Stock',
    COUNT(CASE WHEN stock > 0 AND stock <= min_stock THEN 1 END) as 'Low Stock',
    COUNT(CASE WHEN stock > min_stock AND stock < max_stock THEN 1 END) as 'Normal',
    COUNT(CASE WHEN stock >= max_stock THEN 1 END) as 'High Stock'
FROM products WHERE status = 'on_sale';

SELECT '===== Categories with Products =====' as Result;
SELECT 
    pc.name as Category,
    COUNT(p.id) as Products
FROM product_categories pc
LEFT JOIN products p ON pc.id = p.category_id
GROUP BY pc.id, pc.name
ORDER BY pc.sort_order;