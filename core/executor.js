import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { c } from '../ui/colors.js';
import { buildExecCommand } from './shell.js';
import { config } from '../auth/config.js';

const W = () => Math.min(process.stdout.columns || 80, 100);

// ── Denylist / approval modes ───────────────────────────────────────────────
const DENYLIST_PATTERNS = [
  /\brm\s+-rf\b/i, /\bdel\s+\/s\b/i, /\bformat\b/i, /\bshutdown\b/i,
  /\bmkfs\b/i, /\b:(){ :|:& };:/, />\s*\/dev\/sd[a-z]/i,
];

export function isRiskyCommand(cmd) {
  return DENYLIST_PATTERNS.some((re) => re.test(cmd));
}

function confirm(question) {
  return ask(question).then((a) => a !== 'n');
}

// ── Diff ─────────────────────────────────────────────────────────────────────
function diff(oldSrc, newSrc) {
  const a = oldSrc.split('\n'), b = newSrc.split('\n');
  // LCS table
  const dp = Array.from({length: a.length+1}, () => new Array(b.length+1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j], dp[i][j-1]);

  const ops = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) ops.unshift({t:'=', line:a[i-1], ln:i}), i--, j--;
    else if (j > 0 && (i===0 || dp[i][j-1] >= dp[i-1][j])) ops.unshift({t:'+', line:b[j-1], ln:j}), j--;
    else ops.unshift({t:'-', line:a[i-1], ln:i}), i--;
  }
  return ops;
}

function printDiff(oldSrc, newSrc, filePath) {
  const ops = diff(oldSrc ?? '', newSrc);
  const changedIdx = new Set(ops.flatMap((o,i) => o.t !== '=' ? [i] : []));
  if (!changedIdx.size) return { added: 0, removed: 0 };

  const show = new Set();
  changedIdx.forEach(i => { for (let k=i-3; k<=i+3; k++) if (k>=0&&k<ops.length) show.add(k); });

  let added = 0, removed = 0, lastI = -2, lineNo = { old: 1, new: 1 };

  for (const i of [...show].sort((a,b)=>a-b)) {
    if (i > lastI+1) {
      const op = ops[i];
      process.stdout.write(`${c.dim}     ··· ${filePath}${c.reset}\n`);
    }
    const {t, line} = ops[i];
    const lnOld = t !== '+' ? String(lineNo.old).padStart(4) : '    ';
    const lnNew = t !== '-' ? String(lineNo.new).padStart(4) : '    ';
    if (t === '+') {
      process.stdout.write(`${c.dim}${lnOld}${lnNew}${c.reset} ${c.green}+${c.reset} ${c.green}${line}${c.reset}\n`);
      lineNo.new++; added++;
    } else if (t === '-') {
      process.stdout.write(`${c.dim}${lnOld}${lnNew}${c.reset} ${c.red}-${c.reset} ${c.dim}${line}${c.reset}\n`);
      lineNo.old++; removed++;
    } else {
      process.stdout.write(`${c.dim}${lnOld}${lnNew}   ${line}${c.reset}\n`);
      lineNo.old++; lineNo.new++;
    }
    lastI = i;
  }
  return { added, removed };
}

// ── File header (Claude Code style) ──────────────────────────────────────────
function fileHeader(label, icon, color, filePath, isNew) {
  const tag = `${color}${c.bold}${icon} ${label}${c.reset}`;
  const fp  = `${c.bold}${filePath}${c.reset}`;
  process.stdout.write(`\n${tag} ${fp}\n`);
  process.stdout.write(`${c.dim}${'─'.repeat(Math.min(W(), filePath.length + 12))}${c.reset}\n`);
}

// ── Ask ───────────────────────────────────────────────────────────────────────
function ask(q) {
  return new Promise(resolve => {
    process.stdout.write(q);
    let buf = '';
    const onData = (k) => {
      if (k === '\x03') { cleanup(); process.exit(0); }
      if (k === '\r' || k === '\n') { cleanup(); process.stdout.write('\n'); resolve(buf.trim().toLowerCase()); return; }
      if (k === '\x7f') { buf = buf.slice(0, -1); return; }
      if (k >= ' ') { buf += k; process.stdout.write(k); }
    };
    const cleanup = () => { process.stdin.removeListener('data', onData); };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', onData);
  });
}

function snapshot(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

function sanitizeActionPath(raw = '') {
  let p = String(raw).trim();
  // Strip wrapping quotes
  p = p.replace(/^['"`](.*)['"`]$/s, '$1').trim();
  // Strip trailing explanatory parenthesis, e.g. "file.md (existing)"
  p = p.replace(/\s+\([^)]*\)\s*$/g, '').trim();
  return p;
}

// ── Parse / strip ─────────────────────────────────────────────────────────────
export function parseActions(text) {
  const actions = [];
  const wr = /WRITE_FILE:\s*([^\n]+)\n```(?:\w+)?\n([\s\S]*?)```/g;
  const cr = /RUN_CMD:\s*([^\n]+)/g;
  const dr = /DELETE_FILE:\s*([^\n]+)/g;
  let m;
  while ((m = wr.exec(text))) actions.push({ type:'write',  path:sanitizeActionPath(m[1]), content:m[2] });
  while ((m = cr.exec(text))) actions.push({ type:'cmd',    command:m[1].trim() });
  while ((m = dr.exec(text))) actions.push({ type:'delete', path:sanitizeActionPath(m[1]) });
  return actions;
}

export function stripActions(text) {
  return text
    .replace(/WRITE_FILE:\s*[^\n]+\n```(?:\w+)?\n[\s\S]*?```/g, '')
    .replace(/RUN_CMD:\s*[^\n]+/g, '')
    .replace(/DELETE_FILE:\s*[^\n]+/g, '')
    .trim();
}

// ── Execute ───────────────────────────────────────────────────────────────────
export async function executeActions(actions, cwd, undoStack, autorun = false) {
  const summary = [];
  const report = { writes: [], commands: [], deletes: [], failures: [] };

  for (const action of actions) {

    if (action.type === 'write') {
      const full = path.isAbsolute(action.path) ? action.path : path.join(cwd, action.path);
      const old  = snapshot(full);
      const isNew = old === null;

      fileHeader(
        isNew ? 'Creating' : 'Editing',
        isNew ? '✚' : '✏',
        isNew ? c.green : c.yellow,
        action.path
      );

      const { added, removed } = printDiff(old ?? '', action.content, action.path);

      // Stats line
      const stats = [
        added   ? `${c.green}+${added}${c.reset}`   : '',
        removed ? `${c.red}-${removed}${c.reset}` : '',
      ].filter(Boolean).join('  ');
      process.stdout.write(`\n  ${stats || c.dim+'(unchanged)'+c.reset}\n`);

      let ok = autorun;
      if (!ok) {
        const a = await ask(`  ${c.cyan}Apply?${c.reset} ${c.dim}[Y/n/a(ll)]${c.reset} `);
        if (a === 'a') { autorun = true; ok = true; }
        else ok = a !== 'n';
      }

      if (ok) {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, action.content, 'utf8');
        undoStack.push({ type:'write', path:full, old });
        process.stdout.write(`  ${c.green}✓ Written${c.reset}\n`);
        summary.push({ icon: isNew ? '✚' : '✏', color: isNew ? c.green : c.yellow, path: action.path, stats: `+${added} -${removed}` });
        report.writes.push({ path: action.path, success: true, added, removed, isNew });
      } else {
        process.stdout.write(`  ${c.dim}Skipped${c.reset}\n`);
        report.writes.push({ path: action.path, success: false, skipped: true });
      }

    } else if (action.type === 'cmd') {
      process.stdout.write(`\n${c.yellow}${c.bold}⚡ Running${c.reset} ${c.bold}${action.command}${c.reset}\n`);
      process.stdout.write(`${c.dim}${'─'.repeat(Math.min(W(), action.command.length + 12))}${c.reset}\n`);

      let ok = autorun;
      if (!ok) {
        const approvalMode = config.get('approvalMode', 'risky-only');
        const needsPrompt = approvalMode === 'always'
          || (approvalMode === 'risky-only' && isRiskyCommand(action.command));
        ok = needsPrompt
          ? await confirm(`  ${c.cyan}Run?${c.reset} ${c.dim}[Y/n]${c.reset} `)
          : true;
      }
      if (ok) {
        try {
          const execCommand = buildExecCommand(action.command);
          const out = execSync(execCommand, { cwd, encoding:'utf8', stdio:['pipe','pipe','pipe'] });
          process.stdout.write(`  ${c.green}✓${c.reset}\n`);
          if (out.trim()) process.stdout.write(`${c.dim}${out.trim()}${c.reset}\n`);
          undoStack.push({ type:'cmd', command:action.command });
          summary.push({ icon:'⚡', color:c.yellow, path:action.command, stats:'' });
          report.commands.push({ command: action.command, success: true, output: out?.trim() || '' });
        } catch(e) {
          const err = String(e.stderr || e.message || 'Unknown command error').trim();
          process.stdout.write(`  ${c.red}✗ ${err}${c.reset}\n`);
          report.commands.push({ command: action.command, success: false, error: err });
          report.failures.push({ type: 'cmd', command: action.command, error: err });
        }
      }

    } else if (action.type === 'delete') {
      const full = path.isAbsolute(action.path) ? action.path : path.join(cwd, action.path);
      const old = snapshot(full);
      fileHeader('Deleting', '✖', c.red, action.path);
      if (old) {
        const { removed } = printDiff(old, '', action.path);
        process.stdout.write(`\n  ${c.red}-${removed}${c.reset}\n`);
      }
      let ok = autorun;
      if (!ok) {
        const approvalMode = config.get('approvalMode', 'risky-only');
        const needsPrompt = approvalMode !== 'never'; // delete always prompts unless 'never'
        ok = needsPrompt
          ? await confirm(`  ${c.cyan}Delete?${c.reset} ${c.dim}[Y/n]${c.reset} `)
          : true;
      }
      if (ok) {
        try {
          if (!fs.existsSync(full)) throw new Error(`ENOENT: no such file or directory, unlink '${full}'`);
          const st = fs.statSync(full);
          if (st.isDirectory()) fs.rmSync(full, { recursive: true, force: false });
          else fs.unlinkSync(full);
          undoStack.push({type:'delete',path:full,old});
          process.stdout.write(`  ${c.green}✓ Deleted${c.reset}\n`);
          summary.push({icon:'✖',color:c.red,path:action.path,stats:old?`-${old.split('\n').length}`:''});
          report.deletes.push({ path: action.path, success: true });
        }
        catch(e) {
          const err = String(e.message || 'Unknown delete error').trim();
          process.stdout.write(`  ${c.red}✗ ${err}${c.reset}\n`);
          report.deletes.push({ path: action.path, success: false, error: err });
          report.failures.push({ type: 'delete', path: action.path, error: err });
        }
      }
    }
  }

  // ── Summary bar ──────────────────────────────────────────────────────────
  if (summary.length > 1) {
    process.stdout.write(`\n${c.dim}${'─'.repeat(48)}${c.reset}\n`);
    for (const s of summary)
      process.stdout.write(`  ${s.color}${s.icon}${c.reset} ${s.path}  ${c.dim}${s.stats}${c.reset}\n`);
    process.stdout.write('\n');
  }

  return report;
}

export function undoLast(undoStack) {
  if (!undoStack.length) { process.stdout.write(`  ${c.yellow}Nothing to undo.${c.reset}\n`); return; }
  const a = undoStack.pop();
  if (a.type === 'write') {
    if (a.old === null) { fs.unlinkSync(a.path); process.stdout.write(`  ${c.green}✓ Undo: deleted ${a.path}${c.reset}\n`); }
    else { fs.writeFileSync(a.path, a.old, 'utf8'); process.stdout.write(`  ${c.green}✓ Undo: restored ${a.path}${c.reset}\n`); }
  } else if (a.type === 'delete' && a.old) {
    fs.writeFileSync(a.path, a.old, 'utf8'); process.stdout.write(`  ${c.green}✓ Undo: restored ${a.path}${c.reset}\n`);
  } else {
    process.stdout.write(`  ${c.yellow}Cannot auto-undo: ${a.command}${c.reset}\n`);
  }
}
