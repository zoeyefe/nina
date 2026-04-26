import fs from 'fs';
import path from 'path';
import os from 'os';

const NINA_DIR = path.join(os.homedir(), '.nina');
const CREDS_FILE = path.join(NINA_DIR, 'credentials.json');
const CONFIG_FILE = path.join(NINA_DIR, 'config.json');

function ensureDir() {
  if (!fs.existsSync(NINA_DIR)) fs.mkdirSync(NINA_DIR, { recursive: true });
}

function loadCreds() {
  try {
    const raw = fs.readFileSync(CREDS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCreds(data) {
  ensureDir();
  fs.writeFileSync(CREDS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export const config = {
  ninaDir: NINA_DIR,

  setKey(provider, key) {
    const creds = loadCreds();
    creds[provider] = Buffer.from(key).toString('base64');
    saveCreds(creds);
  },

  getKey(provider) {
    // Env vars take priority
    const envMap = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      gemini: 'GEMINI_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      groq: 'GROQ_API_KEY',
      mistral: 'MISTRAL_API_KEY',
      cohere: 'COHERE_API_KEY',
    };
    if (envMap[provider] && process.env[envMap[provider]]) {
      return process.env[envMap[provider]];
    }
    const creds = loadCreds();
    if (creds[provider]) {
      return Buffer.from(creds[provider], 'base64').toString('utf8');
    }
    return null;
  },

  removeKey(provider) {
    const creds = loadCreds();
    delete creds[provider];
    saveCreds(creds);
  },

  listKeys() {
    const creds = loadCreds();
    return Object.keys(creds);
  },

  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      return {};
    }
  },

  saveConfig(cfg) {
    ensureDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  },

  get(key, def = null) {
    return this.loadConfig()[key] ?? def;
  },

  set(key, value) {
    const cfg = this.loadConfig();
    cfg[key] = value;
    this.saveConfig(cfg);
  },

  isFirstRun() {
    return !fs.existsSync(CONFIG_FILE);
  },
};
