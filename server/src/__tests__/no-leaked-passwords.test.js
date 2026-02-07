import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/*
 * P0-4 regression — no hardcoded default passwords in source code.
 *
 * Scans client source, server source, and config files to ensure
 * 'Admin@123456' (and related default passwords) do not appear.
 *
 * This test does NOT require a database or running server.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..', '..');

const FORBIDDEN = 'Admin@123456';

/** Recursively collect files matching extensions */
function collectFiles(dir, exts, result = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return result; }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      collectFiles(full, exts, result);
    } else if (exts.some(e => full.endsWith(e))) {
      result.push(full);
    }
  }
  return result;
}

describe('P0-4 regression — no leaked default passwords', () => {

  it('client/src/ should not contain Admin@123456', () => {
    const clientSrc = join(ROOT, 'client', 'src');
    const files = collectFiles(clientSrc, ['.jsx', '.js', '.ts', '.tsx', '.json']);
    const hits = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      if (content.includes(FORBIDDEN)) {
        hits.push(f.replace(ROOT, ''));
      }
    }
    expect(hits).toEqual([]);
  });

  it('server/src/ should not contain hardcoded Admin@123456 (excluding tests)', () => {
    const serverSrc = join(ROOT, 'server', 'src');
    const files = collectFiles(serverSrc, ['.js', '.mjs'])
      .filter(f => !f.includes('__tests__'));
    const hits = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      if (content.includes(FORBIDDEN)) {
        hits.push(f.replace(ROOT, ''));
      }
    }
    expect(hits).toEqual([]);
  });

  it('.env.example should not contain Admin@123456', () => {
    const envFile = join(ROOT, 'server', '.env.example');
    const content = readFileSync(envFile, 'utf-8');
    expect(content).not.toContain(FORBIDDEN);
  });

  it('Login component should gate demo password behind VITE_DEMO_ADMIN_PASSWORD env var', () => {
    const loginFile = join(ROOT, 'client', 'src', 'pages', 'Login', 'index.jsx');
    const content = readFileSync(loginFile, 'utf-8');
    // Must NOT have any hardcoded password
    expect(content).not.toContain(FORBIDDEN);
    // Must reference the env var
    expect(content).toContain('VITE_DEMO_ADMIN_PASSWORD');
  });
});
