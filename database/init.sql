-- 创建数据库
CREATE DATABASE IF NOT EXISTS dragon_mill_pos 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE dragon_mill_pos;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码（加密）',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    phone VARCHAR(20) COMMENT '手机号',
    role ENUM('admin', 'staff') DEFAULT 'staff' COMMENT '角色',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
    last_login_at DATETIME COMMENT '最后登录时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME COMMENT '删除时间（软删除）',
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 插入默认管理员账户（密码由环境变量 DEFAULT_ADMIN_PASSWORD 设置）
INSERT INTO users (username, password, name, role) VALUES 
('admin', '$2a$10$YourHashedPasswordHere', '系统管理员', 'admin');

-- 创建操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    module VARCHAR(50) NOT NULL COMMENT '模块',
    action VARCHAR(50) NOT NULL COMMENT '操作',
    content TEXT COMMENT '操作内容',
    ip VARCHAR(50) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_module (module),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 创建商品分类表
CREATE TABLE IF NOT EXISTS product_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    description VARCHAR(200) COMMENT '分类描述',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类表';

-- 创建商品表
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL COMMENT '分类ID',
    name VARCHAR(100) NOT NULL COMMENT '商品名称',
    short_name VARCHAR(50) COMMENT '商品简称',
    barcode VARCHAR(50) COMMENT '条形码',
    unit VARCHAR(20) DEFAULT '个' COMMENT '单位',
    price DECIMAL(10, 2) NOT NULL COMMENT '售价',
    cost DECIMAL(10, 2) COMMENT '成本价',
    member_price DECIMAL(10, 2) COMMENT '会员价',
    stock INT DEFAULT 0 COMMENT '库存',
    min_stock INT DEFAULT 0 COMMENT '最低库存',
    max_stock INT DEFAULT 1000 COMMENT '最高库存',
    status ENUM('on_sale', 'off_sale') DEFAULT 'on_sale' COMMENT '状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES product_categories(id),
    INDEX idx_category_id (category_id),
    INDEX idx_barcode (barcode),
    INDEX idx_status (status),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- 创建会员表
CREATE TABLE IF NOT EXISTS members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    member_no VARCHAR(20) UNIQUE NOT NULL COMMENT '会员号',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    phone VARCHAR(20) UNIQUE NOT NULL COMMENT '手机号',
    birthday DATE COMMENT '生日',
    email VARCHAR(100) COMMENT '邮箱',
    points INT DEFAULT 0 COMMENT '积分',
    total_consumption DECIMAL(10, 2) DEFAULT 0.00 COMMENT '累计消费',
    join_date DATE DEFAULT (CURRENT_DATE) COMMENT '入会日期',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
    remark TEXT COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_member_no (member_no),
    INDEX idx_phone (phone),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员表';

-- 创建订单表
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(30) UNIQUE NOT NULL COMMENT '订单号',
    member_id INT COMMENT '会员ID',
    user_id INT NOT NULL COMMENT '收银员ID',
    total_amount DECIMAL(10, 2) NOT NULL COMMENT '总金额',
    discount_amount DECIMAL(10, 2) DEFAULT 0.00 COMMENT '优惠金额',
    actual_amount DECIMAL(10, 2) NOT NULL COMMENT '实付金额',
    payment_method VARCHAR(20) NOT NULL COMMENT '支付方式',
    points_earned INT DEFAULT 0 COMMENT '获得积分',
    points_used INT DEFAULT 0 COMMENT '使用积分',
    status ENUM('completed', 'cancelled', 'refunded') DEFAULT 'completed' COMMENT '状态',
    remark TEXT COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_order_no (order_no),
    INDEX idx_member_id (member_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 创建订单详情表
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '订单ID',
    product_id INT NOT NULL COMMENT '商品ID',
    product_name VARCHAR(100) NOT NULL COMMENT '商品名称',
    price DECIMAL(10, 2) NOT NULL COMMENT '单价',
    quantity INT NOT NULL COMMENT '数量',
    subtotal DECIMAL(10, 2) NOT NULL COMMENT '小计',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单详情表';

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(50) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    description VARCHAR(200) COMMENT '配置描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 插入默认配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('shop_name', '神龙磨坊', '店铺名称'),
('shop_address', '', '店铺地址'),
('shop_phone', '', '店铺电话'),
('points_rate', '1', '积分比例（消费1元获得积分）'),
('points_value', '100', '积分价值（100积分抵扣1元）'),
('receipt_footer', '谢谢惠顾，欢迎下次光临！', '小票底部文字');

-- 创建库存记录表
CREATE TABLE IF NOT EXISTS stock_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL COMMENT '商品ID',
    type ENUM('purchase', 'sale', 'adjust', 'loss') NOT NULL COMMENT '类型',
    quantity INT NOT NULL COMMENT '数量',
    before_stock INT COMMENT '操作前库存',
    after_stock INT COMMENT '操作后库存',
    remark VARCHAR(200) COMMENT '备注',
    operator_id INT COMMENT '操作人ID',
    operator_name VARCHAR(50) COMMENT '操作人姓名',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_product_id (product_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存记录表';

-- 插入测试分类数据
INSERT INTO product_categories (name, description, sort_order) VALUES
('五谷杂粮', '各类五谷杂粮及其制品', 1),
('养生粉类', '各种养生保健粉类产品', 2),
('坚果炒货', '各类坚果和炒货制品', 3),
('调味香料', '各种调味品和香料', 4),
('其他商品', '其他商品分类', 99);

-- 插入测试商品数据
INSERT INTO products (category_id, name, short_name, barcode, unit, price, cost, member_price, stock, min_stock) VALUES
(1, '五谷杂粮粉', '五谷粉', '6901234567890', '斤', 30.00, 20.00, 28.00, 100, 10),
(2, '黑芝麻糊', '芝麻糊', '6901234567891', '包', 35.00, 25.00, 32.00, 50, 5),
(2, '红豆薏米粉', '红豆粉', '6901234567892', '斤', 28.00, 18.00, 26.00, 80, 10),
(3, '核桃粉', '核桃粉', '6901234567893', '斤', 40.00, 30.00, 38.00, 30, 5),
(1, '营养早餐粉', '早餐粉', '6901234567894', '包', 25.00, 15.00, 23.00, 60, 10);