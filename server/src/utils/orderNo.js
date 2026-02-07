import crypto from 'crypto';

/**
 * Generate a human-readable order number.
 *
 * Format: YYYYMMDDHHMMSS (14) + SEQ (3) + RANDOM (6) = 23 chars
 * Example: 20260207143052 007 847291  →  "20260207143052007847291"
 * Column:  order_no VARCHAR(30) — fits comfortably.
 *
 * SEQ is a process-local monotonic counter (0–999, wraps).
 * It guarantees uniqueness within a single Node.js process even under
 * tight loops where Date and random could collide (birthday paradox).
 *
 * The 6-digit crypto random prevents collisions across processes / restarts.
 * Combined collision probability is negligible; DB retry handles the edge case.
 */

let _seq = 0;

export function generateOrderNo() {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const seq = String((_seq++) % 1000).padStart(3, '0');
  const rand = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  return `${ts}${seq}${rand}`;
}
