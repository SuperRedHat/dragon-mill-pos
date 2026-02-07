import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/*
 * Regression tests for cashier checkout flow fixes:
 *
 * 1. QueryTypes must be imported (was missing → recipe_usage_logs INSERT threw ReferenceError)
 * 2. orderNo must be generated before processing loops (was generated twice:
 *    once in stock record remark, once in Order.create — producing different values)
 * 3. recipe_usage_logs INSERT must use order.id AFTER order creation
 *    (was referencing order.id BEFORE Order.create → undefined)
 *
 * These are static source-code assertions — no DB required.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cashierSource = readFileSync(join(__dirname, '..', 'routes', 'cashier.js'), 'utf-8');

describe('cashier checkout flow — source-level regression', () => {

  it('should import QueryTypes from sequelize', () => {
    // QueryTypes is needed for recipe_usage_logs INSERT
    expect(cashierSource).toMatch(/import\s*\{[^}]*QueryTypes[^}]*\}\s*from\s*['"]sequelize['"]/);
  });

  it('should generate orderNo before the processing loops', () => {
    // orderNo must be defined before any stock record remark or Order.create references it
    const orderNoDeclPos = cashierSource.indexOf('let orderNo = generateOrderNo()');
    const stockRemarkPos = cashierSource.indexOf('销售出库，订单号:');
    const orderCreatePos = cashierSource.indexOf('orderNo,', cashierSource.indexOf('Order.create'));

    expect(orderNoDeclPos).toBeGreaterThan(-1);
    expect(stockRemarkPos).toBeGreaterThan(-1);
    expect(orderCreatePos).toBeGreaterThan(-1);

    // orderNo declaration must come BEFORE both usages
    expect(orderNoDeclPos).toBeLessThan(stockRemarkPos);
    expect(orderNoDeclPos).toBeLessThan(orderCreatePos);
  });

  it('should NOT call generateOrderNo() in stock record remark', () => {
    // The remark should reference the pre-generated orderNo variable, not call the function again
    expect(cashierSource).not.toMatch(/remark:.*generateOrderNo\(\)/);
  });

  it('should NOT call generateOrderNo() inside Order.create', () => {
    // Order.create should use the orderNo variable, not call the function
    const orderCreateBlock = cashierSource.slice(
      cashierSource.indexOf('Order.create('),
      cashierSource.indexOf('}, { transaction: t }', cashierSource.indexOf('Order.create(')) + 30
    );
    expect(orderCreateBlock).not.toMatch(/generateOrderNo\(\)/);
    expect(orderCreateBlock).toMatch(/orderNo/);
  });

  it('should write recipe_usage_logs AFTER Order.create (not before)', () => {
    const orderCreatePos = cashierSource.indexOf('Order.create(');
    const recipeLogInsertPos = cashierSource.indexOf('INSERT INTO recipe_usage_logs');

    expect(orderCreatePos).toBeGreaterThan(-1);
    expect(recipeLogInsertPos).toBeGreaterThan(-1);

    // The INSERT must come AFTER Order.create
    expect(recipeLogInsertPos).toBeGreaterThan(orderCreatePos);
  });

  it('recipe_usage_logs INSERT should reference order.id (not undefined)', () => {
    // Find the INSERT block and verify it uses order.id in replacements
    const insertIdx = cashierSource.indexOf('INSERT INTO recipe_usage_logs');
    const contextAfter = cashierSource.slice(insertIdx, insertIdx + 300);

    // Should reference order.id in the replacements array
    expect(contextAfter).toMatch(/order\.id/);
  });
});
