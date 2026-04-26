import fs from 'fs';
import path from 'path';
import os from 'os';
import { paint, c } from '../ui/colors.js';

const TASKS_FILE = path.join(os.homedir(), '.nina', 'daemon-tasks.json');

function loadTasks() {
  try { return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8')); } catch { return []; }
}

function saveTasks(tasks) {
  fs.mkdirSync(path.dirname(TASKS_FILE), { recursive: true });
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

export const daemonPlugin = {
  description: '7/24 autonomous task scheduler',
  _timers: new Map(),

  // Schedule a recurring AI task
  schedule(id, intervalMs, prompt, sendMessage) {
    if (this._timers.has(id)) clearInterval(this._timers.get(id));
    const timer = setInterval(async () => {
      process.stdout.write(`\n${c.dim}[daemon:${id}] running...${c.reset}\n`);
      try {
        const result = await sendMessage(prompt, { raw: true });
        process.stdout.write(`${c.dim}[daemon:${id}] done${c.reset}\n`);
        this._log(id, prompt, result);
      } catch (e) {
        process.stdout.write(`${paint.error(`[daemon:${id}] error: ${e.message}`)}\n`);
      }
    }, intervalMs);
    this._timers.set(id, timer);

    const tasks = loadTasks().filter(t => t.id !== id);
    tasks.push({ id, intervalMs, prompt, created: new Date().toISOString() });
    saveTasks(tasks);
    console.log(paint.success(`Scheduled "${id}" every ${Math.round(intervalMs/1000/60)}min`));
  },

  // Watch a file and trigger AI when it changes
  watchFile(filePath, prompt, sendMessage) {
    const id = `watch:${path.basename(filePath)}`;
    if (this._timers.has(id)) { this._timers.get(id).close?.(); this._timers.delete(id); }
    const watcher = fs.watch(filePath, async () => {
      const content = fs.readFileSync(filePath, 'utf8').slice(0, 2000);
      await sendMessage(`${prompt}\n\nFile content:\n${content}`, { raw: true });
    });
    this._timers.set(id, watcher);
    console.log(paint.success(`Watching ${filePath}`));
  },

  // Cancel a scheduled task
  cancel(id) {
    const timer = this._timers.get(id);
    if (!timer) { console.log(paint.warn(`No task: ${id}`)); return; }
    clearInterval(timer);
    timer.close?.();
    this._timers.delete(id);
    saveTasks(loadTasks().filter(t => t.id !== id));
    console.log(paint.success(`Cancelled: ${id}`));
  },

  // List running tasks
  list() {
    const tasks = loadTasks();
    if (!tasks.length) { console.log(paint.dim('No scheduled tasks.')); return; }
    console.log(`\n${paint.bold('Scheduled tasks:')}\n`);
    for (const t of tasks) {
      const running = this._timers.has(t.id);
      console.log(`  ${running ? paint.success('●') : paint.dim('○')} ${paint.bold(t.id)} — every ${Math.round(t.intervalMs/1000/60)}min`);
      console.log(`    ${paint.dim(t.prompt.slice(0, 60))}`);
    }
    console.log();
  },

  _log(id, prompt, result) {
    const logFile = path.join(os.homedir(), '.nina', `daemon-${id}.log`);
    const entry = `\n[${new Date().toISOString()}]\nPrompt: ${prompt}\nResult: ${result?.slice(0, 500)}\n`;
    fs.appendFileSync(logFile, entry);
  },
};
