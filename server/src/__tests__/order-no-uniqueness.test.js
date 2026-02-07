import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/*
 * P1-3 regression — order number collision risk.
 *
 * Part A: Utility checks — generateOrderNo format, counter + 6-digit random, uniqueness.
 * Part B: Source checks — all consumers use the centralized utility; retry logic present.
 * Part C: Concurrent uniqueness — 20 rapid calls, assert all distinct.
 *
 * HTTP concurrent checkout test requires MySQL — see SPRINT_1.md manual verification.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROUTES = join(__dirname, '..', 'routes');
const UTILS  = join(__dirname, '..', 'utils');
const MODELS = join(__dirname, '..', 'models');
const DB     = join(__dirname, '..', 'database');

const readSrc = (dir, name) => readFileSync(join(dir, name), 'utf-8');

// ---------------------------------------------------------------------------
// Part A: generateOrderNo utility — format & uniqueness
// ---------------------------------------------------------------------------
describe('P1-3 — generateOrderNo utility', () => {

  let generateOrderNo;

  beforeAll(async () => {
    const mod = await import('../utils/orderNo.js');
    generateOrderNo = mod.generateOrderNo;
  });

  it('should return a 23-character numeric string (14 date + 3 seq + 6 random)', () => {
    const no = generateOrderNo();
    expect(no).toHaveLength(23);
    expect(no).toMatch(/^\d{23}$/);
  });

  it('should start with a valid YYYYMMDD date prefix', () => {
    const no = generateOrderNo();
    const year = parseInt(no.slice(0, 4), 10);
    const month = parseInt(no.slice(4, 6), 10);
    const day = parseInt(no.slice(6, 8), 10);
    expect(year).toBeGreaterThanOrEqual(2024);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });

  it('should produce 1000 unique values in a tight loop (counter guarantees)', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateOrderNo());
    }
    expect(ids.size).toBe(1000);
  });

  it('should produce 20 unique values when called concurrently via Promise.all', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => Promise.resolve(generateOrderNo()))
    );
    const unique = new Set(results);
    expect(unique.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Part B: Source checks — centralized utility used everywhere
// ---------------------------------------------------------------------------
describe('P1-3 — centralized orderNo usage (static source checks)', () => {

  const cashierSrc  = readSrc(ROUTES, 'cashier.js');
  const orderSrc    = readSrc(MODELS, 'Order.js');
  const initSrc     = readSrc(DB, 'init.js');
  const utilSrc     = readSrc(UTILS, 'orderNo.js');

  it('orderNo.js should use crypto.randomInt for 6-digit random', () => {
    expect(utilSrc).toMatch(/crypto\.randomInt\(0,\s*1_000_000\)/);
    expect(utilSrc).toMatch(/padStart\(6/);
  });

  it('orderNo.js should have a monotonic counter for within-process uniqueness', () => {
    expect(utilSrc).toMatch(/let _seq\s*=/);
    expect(utilSrc).toMatch(/_seq\+\+/);
  });

  it('cashier.js should import generateOrderNo from utils (not define locally)', () => {
    expect(cashierSrc).toMatch(/import\s*\{[^}]*generateOrderNo[^}]*\}\s*from\s*['"]\.\.\/utils\/orderNo\.js['"]/);
    expect(cashierSrc).not.toMatch(/const generateOrderNo = \(\)/);
  });

  it('Order.js model should import generateOrderNo from utils', () => {
    expect(orderSrc).toMatch(/import\s*\{[^}]*generateOrderNo[^}]*\}\s*from\s*['"]\.\.\/utils\/orderNo\.js['"]/);
    expect(orderSrc).not.toMatch(/Math\.floor\(Math\.random\(\)/);
  });

  it('init.js should import generateOrderNo from utils (not define locally)', () => {
    expect(initSrc).toMatch(/import\s*\{[^}]*generateOrderNo[^}]*\}\s*from\s*['"]\.\.\/utils\/orderNo\.js['"]/);
    expect(initSrc).not.toMatch(/const generateOrderNo = \(\)/);
  });

  it('cashier.js should have retry logic for SequelizeUniqueConstraintError', () => {
    expect(cashierSrc).toMatch(/SequelizeUniqueConstraintError/);
    expect(cashierSrc).toMatch(/attempt\s*<\s*3/);
  });

  it('no source file should use the old 3-digit Math.random pattern', () => {
    const oldPattern = /Math\.floor\(Math\.random\(\)\s*\*\s*1000\)\.toString\(\)\.padStart\(3/;
    expect(cashierSrc).not.toMatch(oldPattern);
    expect(orderSrc).not.toMatch(oldPattern);
    expect(initSrc).not.toMatch(oldPattern);
  });
});
