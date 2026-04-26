import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { paint, c } from '../ui/colors.js';

export const debugPlugin = {
  description: 'Debug: error analysis, log watching, port scan, network',

  // Parse and summarize a stack trace
  parseStackTrace(text) {
    const lines = text.split('\n');
    const errorLine = lines.find(l => /Error:|Exception:|TypeError:|SyntaxError:/.test(l));
    const frames = lines.filter(l => /^\s+at /.test(l)).slice(0, 5);
    return { error: errorLine?.trim(), frames: frames.map(f => f.trim()) };
  },

  // Tail a log file (last N lines)
  tailLog(filePath, n = 50) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').slice(-n).join('\n');
    } catch (e) { return `Error: ${e.message}`; }
  },

  // Watch a log file and call callback on new lines
  watchLog(filePath, callback) {
    let size = 0;
    try { size = fs.statSync(filePath).size; } catch {}
    return setInterval(() => {
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > size) {
          const fd = fs.openSync(filePath, 'r');
          const buf = Buffer.alloc(stat.size - size);
          fs.readSync(fd, buf, 0, buf.length, size);
          fs.closeSync(fd);
          size = stat.size;
          callback(buf.toString('utf8'));
        }
      } catch {}
    }, 500);
  },

  // Active ports
  ports() {
    try {
      if (process.platform === 'win32') {
        const out = execSync('netstat -ano -p TCP', { encoding: 'utf8' });
        return out.split('\n')
          .filter(l => l.includes('LISTENING'))
          .slice(0, 20)
          .map(l => l.trim());
      }
      return execSync('lsof -i -P -n | grep LISTEN', { encoding: 'utf8' }).split('\n').slice(0, 20);
    } catch { return []; }
  },

  // What's using a port
  whatsOnPort(port) {
    try {
      if (process.platform === 'win32') {
        return execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' }).trim();
      }
      return execSync(`lsof -i :${port}`, { encoding: 'utf8' }).trim();
    } catch { return `Nothing on port ${port}`; }
  },

  // Run tests and capture output
  runTests(cwd) {
    const runners = [
      { file: 'package.json', cmd: 'npm test' },
      { file: 'pytest.ini', cmd: 'pytest -x -q' },
      { file: 'pyproject.toml', cmd: 'pytest -x -q' },
      { file: 'Cargo.toml', cmd: 'cargo test' },
      { file: 'go.mod', cmd: 'go test ./...' },
    ];
    for (const r of runners) {
      if (fs.existsSync(path.join(cwd, r.file))) {
        try {
          const out = execSync(r.cmd, { cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'], timeout: 60000 });
          return { ok: true, output: out };
        } catch (e) {
          return { ok: false, output: (e.stdout || '') + (e.stderr || '') };
        }
      }
    }
    return { ok: null, output: 'No test runner detected.' };
  },

  // Summarize errors in a directory's log files
  scanLogs(dir, pattern = /error|exception|fatal/i) {
    const results = [];
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.log'));
      for (const file of files.slice(0, 5)) {
        const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
        const errors = lines.filter(l => pattern.test(l)).slice(0, 10);
        if (errors.length) results.push({ file, errors });
      }
    } catch {}
    return results;
  },

  // Check if a URL is reachable
  async ping(url) {
    try {
      const start = Date.now();
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      return { ok: res.ok, status: res.status, ms: Date.now() - start };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
};
