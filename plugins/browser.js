import { execSync, spawn } from 'child_process';
import { paint, c } from '../ui/colors.js';

let cdpWs = null;
let cdpMsgId = 1;
const cdpCallbacks = new Map();

// Launch Chrome with remote debugging
export async function launchBrowser(url = 'about:blank') {
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  let chromePath = null;
  for (const p of chromePaths) {
    try { execSync(`"${p}" --version`, { stdio: 'pipe' }); chromePath = p; break; } catch {}
  }
  if (!chromePath) { console.log(paint.error('Chrome/Edge not found')); return false; }

  spawn(chromePath, [
    '--remote-debugging-port=9222',
    '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${process.env.TEMP}\\nina-chrome`,
    url,
  ], { detached: true, stdio: 'ignore' }).unref();

  await new Promise(r => setTimeout(r, 1500));
  return connectCDP();
}

async function connectCDP() {
  try {
    const res = await fetch('http://localhost:9222/json');
    const tabs = await res.json();
    const tab = tabs[0];
    if (!tab) return false;

    cdpWs = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      cdpWs.onopen = resolve;
      cdpWs.onerror = reject;
      cdpWs.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id && cdpCallbacks.has(msg.id)) {
          cdpCallbacks.get(msg.id)(msg.result || msg.error);
          cdpCallbacks.delete(msg.id);
        }
      };
    });
    console.log(paint.success('Browser connected'));
    return true;
  } catch {
    return false;
  }
}

function cdpSend(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!cdpWs || cdpWs.readyState !== WebSocket.OPEN) { reject(new Error('Browser not connected')); return; }
    const id = cdpMsgId++;
    cdpCallbacks.set(id, resolve);
    cdpWs.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { cdpCallbacks.delete(id); reject(new Error('CDP timeout')); }, 10000);
  });
}

export const browserPlugin = {
  description: 'Browser control via Chrome DevTools Protocol',

  async connect() { return connectCDP(); },
  async launch(url) { return launchBrowser(url); },

  async navigate(url) {
    await cdpSend('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 1000));
    console.log(paint.success(`Navigated to ${url}`));
  },

  async eval(expression) {
    const result = await cdpSend('Runtime.evaluate', { expression, returnByValue: true });
    return result?.result?.value;
  },

  async screenshot(outPath) {
    const { data } = await cdpSend('Page.captureScreenshot', { format: 'png' });
    const fs = await import('fs');
    fs.default.writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log(paint.success(`Screenshot saved: ${outPath}`));
  },

  async click(selector) {
    await this.eval(`document.querySelector(${JSON.stringify(selector)})?.click()`);
  },

  async type(selector, text) {
    await this.eval(`
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el) { el.focus(); el.value = ${JSON.stringify(text)}; el.dispatchEvent(new Event('input', {bubbles:true})); }
    `);
  },

  async getText(selector) {
    return this.eval(`document.querySelector(${JSON.stringify(selector)})?.innerText`);
  },

  async getHTML() {
    return this.eval('document.documentElement.outerHTML');
  },

  async getTabs() {
    try {
      const res = await fetch('http://localhost:9222/json');
      return res.json();
    } catch { return []; }
  },

  close() {
    if (cdpWs) { cdpWs.close(); cdpWs = null; }
  },
};
