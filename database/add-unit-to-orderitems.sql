-- 为订单项添加单位字段
USE dragon_mill_pos;

ALTER TABLE order_items 
ADD COLUMN unit VARCHAR(20) DEFAULT '个' COMMENT '单位' AFTER quantity;