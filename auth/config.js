import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const NINA_DIR = path.join(os.homedir(), '.nina');
const CREDS_FILE = path.join(NINA_DIR, 'credentials.json');
const CONFIG_FILE = path.join(NINA_DIR, 'config.json');

function ensureDir() {
  if (!fs.existsSync(NINA_DIR)) fs.mkdirSync(NINA_DIR, { recursive: true });
}

function deriveKey() {
  return crypto.scryptSync(os.hostname() + os.userInfo().username, 'nina-salt', 32);
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('hex') };
}

function decrypt(obj) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(obj.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(obj.tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(obj.data, 'hex')), decipher.final()]).toString('utf8');
}

function isEncryptedShape(value) {
  return value && typeof value === 'object' && typeof value.iv === 'string' && typeof value.tag === 'string' && typeof value.data === 'string';
}

function loadCreds() {
  try {
    const raw = fs.readFileSync(CREDS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    let migrated = false;
    for (const provider of Object.keys(parsed)) {
      const value = parsed[provider];
      if (typeof value === 'string') {
        // Old base64 format — decode and re-encrypt in place.
        const plaintext = Buffer.from(value, 'base64').toString('utf8');
        parsed[provider] = encrypt(plaintext);
        migrated = true;
      }
    }
    if (migrated) saveCreds(parsed);
    return parsed;
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
    creds[provider] = encrypt(key);
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
    if (creds[provider] && isEncryptedShape(creds[provider])) {
      return decrypt(creds[provider]);
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
