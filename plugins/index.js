import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { paint, c } from '../ui/colors.js';
export { browserPlugin } from './browser.js';
export { systemPlugin } from './system.js';
export { debugPlugin } from './debug.js';
export { daemonPlugin } from './daemon.js';

// ── Third-party user plugin loading ─────────────────────────────────────────
export async function loadUserPlugins() {
  const dir = path.join(os.homedir(), '.nina', 'plugins');
  if (!fs.existsSync(dir)) return [];
  const loaded = [];
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    try {
      const mod = await import(`file://${path.join(dir, file).replace(/\\/g, '/')}`);
      if (mod.default?.name) loaded.push(mod.default);
    } catch (e) {
      console.error(`Failed to load plugin ${file}: ${e.message}`);
    }
  }
  return loaded;
}

// ── Web Search ──────────────────────────────────────────────────────────────
export async function webSearch(query) {
  console.log(`\n${paint.info('Searching:')} ${query}\n`);
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`, { headers: { 'User-Agent': 'Nina-CLI/1.0' } });
    const data = await res.json();
    if (data.AbstractText) { console.log(`${paint.bold('Summary:')} ${data.AbstractText}`); if (data.AbstractURL) console.log(paint.dim(data.AbstractURL)); }
    data.RelatedTopics?.slice(0, 5).forEach(t => { if (t.Text) console.log(`  ${c.cyan}•${c.reset} ${t.Text.slice(0, 120)}`); });
    if (!data.AbstractText && !data.RelatedTopics?.length) console.log(paint.dim('No instant answer found.'));
  } catch (e) { console.log(paint.error(`Search error: ${e.message}`)); }
  console.log();
}

// ── Git Plugin ──────────────────────────────────────────────────────────────
export const gitPlugin = {
  description: 'Git integration',
  status(cwd) { try { return execSync('git status --short', { cwd, encoding: 'utf8' }); } catch { return null; } },
  diff(cwd) { try { return execSync('git diff', { cwd, encoding: 'utf8' }); } catch { return null; } },
  log(cwd, n = 10) { try { return execSync(`git log --oneline -${n}`, { cwd, encoding: 'utf8' }); } catch { return null; } },
};

// ── Linter Plugin ───────────────────────────────────────────────────────────
export const linterPlugin = {
  description: 'Run project linter',
  async run(cwd) {
    const { default: fs } = await import('fs');
    const { default: path } = await import('path');
    const linters = [
      { cmd: 'npx eslint . --max-warnings 0 --format compact', check: 'package.json' },
      { cmd: 'python -m pylint .', check: 'pyproject.toml' },
    ];
    for (const l of linters) {
      if (fs.existsSync(path.join(cwd, l.check))) {
        try { return { ok: true, output: execSync(l.cmd, { cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }) }; }
        catch (e) { return { ok: false, output: e.stdout + e.stderr }; }
      }
    }
    return { ok: null, output: 'No linter detected.' };
  },
};

// ── TTS Plugin ──────────────────────────────────────────────────────────────
export const ttsPlugin = {
  description: 'Text-to-speech',
  enabled: false,
  speak(text) {
    if (!this.enabled) return;
    const clean = text.replace(/[^\w\s.,!?]/g, '').slice(0, 500);
    try {
      if (process.platform === 'darwin') execSync(`say "${clean}"`, { stdio: 'ignore' });
      else if (process.platform === 'linux') execSync(`espeak "${clean}"`, { stdio: 'ignore' });
    } catch {}
  },
};

export const plugins = {
  search: { description: 'DuckDuckGo web search', run: webSearch },
  git: gitPlugin,
  linter: linterPlugin,
  tts: ttsPlugin,
};
