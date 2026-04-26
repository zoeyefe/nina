import fs from 'fs';
import { paint, c } from '../ui/colors.js';

export function computeDiff(oldContent, newContent, filePath = '') {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Simple LCS-based diff
  const matrix = Array.from({ length: oldLines.length + 1 }, () => new Array(newLines.length + 1).fill(0));
  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  const hunks = [];
  let i = oldLines.length, j = newLines.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      hunks.unshift({ type: 'context', line: oldLines[i - 1], lineNo: i });
      i--; j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      hunks.unshift({ type: 'added', line: newLines[j - 1], lineNo: j });
      j--;
    } else {
      hunks.unshift({ type: 'removed', line: oldLines[i - 1], lineNo: i });
      i--;
    }
  }

  return hunks;
}

export function printDiff(oldContent, newContent, filePath) {
  const hunks = computeDiff(oldContent, newContent, filePath);

  // Group into visible windows (±3 context lines around changes)
  const changed = hunks.map((h, i) => ({ ...h, idx: i })).filter(h => h.type !== 'context');
  if (!changed.length) {
    console.log(paint.dim('  (no changes)'));
    return;
  }

  console.log(`\n${c.bold}--- ${filePath} (old)${c.reset}`);
  console.log(`${c.bold}+++ ${filePath} (new)${c.reset}\n`);

  const shown = new Set();
  for (const ch of changed) {
    const start = Math.max(0, ch.idx - 3);
    const end = Math.min(hunks.length - 1, ch.idx + 3);
    for (let k = start; k <= end; k++) shown.add(k);
  }

  let lastShown = -2;
  for (const k of [...shown].sort((a, b) => a - b)) {
    if (k > lastShown + 1) console.log(paint.dim('  ...'));
    const h = hunks[k];
    if (h.type === 'added') {
      console.log(paint.added(h.line));
    } else if (h.type === 'removed') {
      console.log(paint.removed(h.line));
    } else {
      console.log(paint.context(h.line));
    }
    lastShown = k;
  }
  console.log();
}

export function applyPatch(originalContent, hunks) {
  // Rebuild from hunks
  return hunks.filter(h => h.type !== 'removed').map(h => h.line).join('\n');
}

// Snapshot a file for undo
export function snapshot(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null; // file didn't exist
  }
}
