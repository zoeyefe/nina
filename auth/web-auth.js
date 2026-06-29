import http from 'http';
import { exec } from 'child_process';
import { config } from './config.js';
import { paint } from '../ui/colors.js';

const PORT = 9876;

const PROVIDERS_META = [
  { id: 'anthropic',  name: 'Anthropic',  color: '#d97706', icon: '◆', envVar: 'ANTHROPIC_API_KEY',  keyLink: 'https://console.anthropic.com/settings/keys',  oauth: false,
    models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] },
  { id: 'openai',     name: 'OpenAI',     color: '#10b981', icon: '◎', envVar: 'OPENAI_API_KEY',     keyLink: 'https://platform.openai.com/api-keys',          oauth: false,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'] },
  { id: 'gemini',     name: 'Gemini',     color: '#3b82f6', icon: '✦', envVar: 'GEMINI_API_KEY',     keyLink: 'https://aistudio.google.com/app/apikey',        oauth: false,
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.5-pro'] },
  { id: 'openrouter', name: 'OpenRouter', color: '#8b5cf6', icon: '⊕', envVar: 'OPENROUTER_API_KEY', keyLink: 'https://openrouter.ai/keys',                   oauth: false,
    models: ['openai/gpt-4o', 'anthropic/claude-opus-4', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.0-flash'] },
  { id: 'groq',       name: 'Groq',       color: '#f43f5e', icon: '⚡', envVar: 'GROQ_API_KEY',       keyLink: 'https://console.groq.com/keys',                 oauth: false,
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'] },
  { id: 'mistral',    name: 'Mistral',    color: '#f97316', icon: '◈', envVar: 'MISTRAL_API_KEY',    keyLink: 'https://console.mistral.ai/api-keys/',          oauth: false,
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'] },
  { id: 'cohere',     name: 'Cohere',     color: '#06b6d4', icon: '◉', envVar: 'COHERE_API_KEY',     keyLink: 'https://dashboard.cohere.com/api-keys',         oauth: false,
    models: ['command-r-plus', 'command-r', 'command-a-03-2025'] },
  { id: 'google',     name: 'Google',     color: '#4285f4', icon: 'G',  envVar: '',                   keyLink: '',                                             oauth: true,  models: [] },
  { id: 'github',     name: 'GitHub',     color: '#24292e', icon: '⌥', envVar: '',                   keyLink: '',                                             oauth: true,  models: [] },
  { id: 'ollama',     name: 'Ollama',     color: '#6b7280', icon: '○', envVar: '',                   keyLink: 'https://ollama.com',                           oauth: false, local: true, models: [] },
];

function html(savedKeys = []) {
  const cards = PROVIDERS_META.map(p => {
    const saved = savedKeys.includes(p.id);
    if (p.local) {
      return `
        <div class="card local" data-id="${p.id}">
          <div class="card-header" style="background:${p.color}22;border-color:${p.color}44">
            <span class="icon" style="color:${p.color}">${p.icon}</span>
            <span class="name">${p.name}</span>
            <span class="badge local-badge">Local</span>
          </div>
          <p class="hint">Runs on your machine. No key needed.<br>Install: <a href="https://ollama.com" target="_blank">ollama.com</a></p>
          <button class="btn" style="background:#6b7280" onclick="testOllama()">Test Connection</button>
          <div id="ollama-status" class="status"></div>
        </div>`;
    }
    if (p.oauth) {
      return `
        <div class="card" data-id="${p.id}">
          <div class="card-header" style="background:${p.color}22;border-color:${p.color}44">
            <span class="icon" style="color:${p.color}">${p.icon}</span>
            <span class="name">${p.name}</span>
            ${saved ? '<span class="badge saved-badge">✓ Connected</span>' : ''}
          </div>
          <p class="hint">Sign in with your ${p.name} account via OAuth.</p>
          <button class="btn oauth-btn" style="background:${p.color}" onclick="startOAuth('${p.id}')">Sign in with ${p.name}</button>
          <div id="status-${p.id}" class="status"></div>
        </div>`;
    }
    return `
      <div class="card" data-id="${p.id}">
        <div class="card-header" style="background:${p.color}22;border-color:${p.color}44">
          <span class="icon" style="color:${p.color}">${p.icon}</span>
          <span class="name">${p.name}</span>
          ${saved ? '<span class="badge saved-badge">✓ Saved</span>' : ''}
        </div>
        <input
          type="password"
          class="key-input"
          id="key-${p.id}"
          placeholder="API Key${p.envVar ? ' or set ' + p.envVar : ''}"
          autocomplete="off"
        />
        <div class="row">
          ${p.keyLink ? `<a class="get-key" href="${p.keyLink}" target="_blank">Get API key →</a>` : '<span></span>'}
          <button class="btn save-btn" style="background:${p.color}" onclick="saveKey('${p.id}')">Save</button>
        </div>
        <div id="status-${p.id}" class="status"></div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nina — Auth Setup</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0f0f11;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;padding:40px 20px}
  .header{text-align:center;margin-bottom:40px}
  .logo{font-size:2.5rem;font-weight:800;letter-spacing:-2px;background:linear-gradient(135deg,#22d3ee,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
  .subtitle{color:#94a3b8;font-size:.95rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;max-width:1100px;margin:0 auto}
  .card{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px}
  .card.local{border-style:dashed}
  .card-header{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;border:1px solid transparent}
  .icon{font-size:1.2rem;width:24px;text-align:center}
  .name{font-weight:600;font-size:1rem;flex:1}
  .badge{font-size:.7rem;padding:2px 8px;border-radius:20px;font-weight:600}
  .saved-badge{background:#065f46;color:#6ee7b7}
  .local-badge{background:#1e3a5f;color:#93c5fd}
  .key-input{background:#09090b;border:1px solid #3f3f46;border-radius:8px;color:#e2e8f0;font-size:.9rem;padding:10px 14px;width:100%;outline:none;transition:border-color .2s}
  .key-input:focus{border-color:#6366f1}
  .row{display:flex;align-items:center;justify-content:space-between}
  .get-key{color:#818cf8;font-size:.8rem;text-decoration:none}
  .get-key:hover{text-decoration:underline}
  .btn{border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:.85rem;font-weight:600;padding:9px 20px;transition:opacity .2s}
  .btn:hover{opacity:.85}
  .hint{color:#71717a;font-size:.82rem;line-height:1.5}
  .hint a{color:#818cf8}
  .status{font-size:.82rem;min-height:18px;transition:all .3s}
  .status.ok{color:#6ee7b7}
  .status.err{color:#f87171}
  .footer{text-align:center;margin-top:40px;color:#52525b;font-size:.8rem}
  .active-section{background:#1e1e2e;border:1px solid #312e81;border-radius:12px;padding:20px;max-width:500px;margin:32px auto;text-align:center}
  .active-section h3{color:#818cf8;margin-bottom:8px}
  #set-active{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px}
  select{background:#09090b;border:1px solid #3f3f46;border-radius:8px;color:#e2e8f0;padding:8px 12px;font-size:.9rem;outline:none;cursor:pointer}
  #model-select{min-width:220px}
  .provider-icon{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px}
</style>
</head>
<body>
<div class="header">
  <div class="logo">nina</div>
  <div class="subtitle">Configure your AI providers — changes apply immediately</div>
</div>

<div class="active-section">
  <h3>Active Provider</h3>
  <p style="color:#94a3b8;font-size:.85rem;margin-bottom:12px">This is what Nina uses for chat</p>
  <div id="set-active">
    <select id="provider-select" onchange="onProviderChange()">
      ${PROVIDERS_META.filter(p => !p.oauth).map(p =>
        `<option value="${p.id}">${p.name}</option>`
      ).join('')}
    </select>
    <select id="model-select" onchange="onModelSelectChange()">
      <option value="">— select model —</option>
    </select>
    <input id="model-input" type="text" class="key-input" style="width:180px" placeholder="or type custom model" />
    <button class="btn" style="background:#6366f1" onclick="setActive()">Set Active</button>
  </div>
  <div id="active-status" class="status" style="margin-top:8px"></div>
</div>

<div class="grid">${cards}</div>

<div class="footer">Keys are stored encrypted in ~/.nina/credentials.json · <a href="/close" style="color:#818cf8" onclick="fetch('/close');setTimeout(()=>window.close(),500)">Close server</a></div>

<script>
async function saveKey(provider) {
  const input = document.getElementById('key-' + provider);
  const key = input.value.trim();
  if (!key) { showStatus(provider, 'Enter a key first', false); return; }
  const res = await fetch('/save-key', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ provider, key })
  });
  const data = await res.json();
  if (data.ok) {
    showStatus(provider, '✓ Saved!', true);
    input.value = '';
    const card = document.querySelector('[data-id="' + provider + '"]');
    const header = card.querySelector('.card-header');
    if (!header.querySelector('.saved-badge')) {
      const b = document.createElement('span');
      b.className = 'badge saved-badge'; b.textContent = '✓ Saved';
      header.appendChild(b);
    }
  } else {
    showStatus(provider, '✗ ' + data.error, false);
  }
}

async function startOAuth(provider) {
  showStatus(provider, 'Opening browser... waiting for callback', true);
  const res = await fetch('/oauth/' + provider);
  const data = await res.json();
  if (data.ok) showStatus(provider, '✓ ' + provider + ' connected!', true);
  else showStatus(provider, '✗ ' + (data.error || 'Failed'), false);
}

async function testOllama() {
  const el = document.getElementById('ollama-status');
  el.textContent = 'Testing...'; el.className = 'status';
  const res = await fetch('/test-ollama');
  const data = await res.json();
  el.textContent = data.ok ? '✓ Ollama is running: ' + data.models : '✗ Not reachable (is Ollama running?)';
  el.className = 'status ' + (data.ok ? 'ok' : 'err');
}

async function setActive() {
  const provider = document.getElementById('provider-select').value;
  const model = document.getElementById('model-input').value.trim();
  const res = await fetch('/set-active', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ provider, model: model || undefined })
  });
  const data = await res.json();
  const el = document.getElementById('active-status');
  el.textContent = data.ok ? '✓ Active: ' + data.provider + ' / ' + data.model : '✗ ' + data.error;
  el.className = 'status ' + (data.ok ? 'ok' : 'err');
  if (data.ok) {
    fetch('/close');
    setTimeout(() => window.close(), 800);
  }
}

function showStatus(provider, msg, ok) {
  const el = document.getElementById('status-' + provider);
  if (!el) return;
  el.textContent = msg;
  el.className = 'status ' + (ok ? 'ok' : 'err');
  if (ok) setTimeout(() => { el.textContent = ''; el.className = 'status'; }, 3000);
}

const PROVIDER_MODELS = ${JSON.stringify(
  Object.fromEntries(PROVIDERS_META.map(p => [p.id, p.models || []]))
)};

function onProviderChange() {
  const pid = document.getElementById('provider-select').value;
  const sel = document.getElementById('model-select');
  document.getElementById('model-input').value = '';
  if (pid === 'ollama') {
    sel.innerHTML = '<option value="">— loading models —</option>';
    fetch('/test-ollama').then(r => r.json()).then(data => {
      if (data.ok && data.models && data.models !== '(none)') {
        const models = data.models.split(',').map(m => m.trim()).filter(Boolean);
        sel.innerHTML = '<option value="">— select model —</option>' +
          models.map(m => '<option value="' + m + '">' + m + '</option>').join('');
      } else {
        sel.innerHTML = '<option value="">— no models found —</option>';
      }
    }).catch(() => {
      sel.innerHTML = '<option value="">— no models found —</option>';
    });
    return;
  }
  const models = PROVIDER_MODELS[pid] || [];
  sel.innerHTML = '<option value="">— select model —</option>' +
    models.map(m => '<option value="' + m + '">' + m + '</option>').join('');
}

function onModelSelectChange() {
  const sel = document.getElementById('model-select');
  if (sel.value) document.getElementById('model-input').value = sel.value;
}

// Init: load current active provider + populate model dropdown
fetch('/current').then(r => r.json()).then(d => {
  if (d.provider) {
    document.getElementById('provider-select').value = d.provider;
    onProviderChange();
    if (d.model) {
      const sel = document.getElementById('model-select');
      // Try to select from list
      const opt = [...sel.options].find(o => o.value === d.model);
      if (opt) { sel.value = d.model; }
      document.getElementById('model-input').value = d.model;
    }
  }
});
</script>
</body>
</html>`;
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

export function startWebAuth() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);

      // ── GET / ─────────────────────────────────────────────
      if (req.method === 'GET' && url.pathname === '/') {
        const savedKeys = config.listKeys();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html(savedKeys));
        return;
      }

      // ── GET /current ──────────────────────────────────────
      if (req.method === 'GET' && url.pathname === '/current') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          provider: config.get('provider', 'anthropic'),
          model: config.get('model', ''),
        }));
        return;
      }

      // ── POST /save-key ─────────────────────────────────────
      if (req.method === 'POST' && url.pathname === '/save-key') {
        const body = await readBody(req);
        try {
          const { provider, key } = JSON.parse(body);
          if (!provider || !key) throw new Error('Missing provider or key');
          config.setKey(provider, key);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
      }

      // ── POST /set-active ───────────────────────────────────
      if (req.method === 'POST' && url.pathname === '/set-active') {
        const body = await readBody(req);
        try {
          const { provider, model } = JSON.parse(body);
          if (!provider) throw new Error('Missing provider');
          config.set('provider', provider);

          const defaultModels = {
            anthropic: 'claude-sonnet-4-6', openai: 'gpt-4o', gemini: 'gemini-2.0-flash',
            openrouter: 'openai/gpt-4o', ollama: 'llama3.2', groq: 'llama-3.3-70b-versatile',
            mistral: 'mistral-large-latest', cohere: 'command-r-plus',
          };
          const finalModel = model || defaultModels[provider] || '';
          config.set('model', finalModel);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, provider, model: finalModel }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
      }

      // ── GET /oauth/:provider ───────────────────────────────
      if (req.method === 'GET' && url.pathname.startsWith('/oauth/')) {
        const provider = url.pathname.split('/')[2];
        try {
          const { googleOAuth, githubOAuth } = await import('./oauth.js');
          if (provider === 'google') await googleOAuth();
          else if (provider === 'github') await githubOAuth();
          else throw new Error('Unknown OAuth provider: ' + provider);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
        return;
      }

      // ── GET /test-ollama ───────────────────────────────────
      if (req.method === 'GET' && url.pathname === '/test-ollama') {
        try {
          const r = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
          const data = await r.json();
          const models = data.models?.map(m => m.name).join(', ') || '(none)';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, models }));
        } catch {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false }));
        }
        return;
      }

      // ── GET /close ────────────────────────────────────────
      if (url.pathname === '/close') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Closing...');
        setTimeout(() => { server.close(); resolve(); }, 300);
        return;
      }

      res.writeHead(404); res.end('Not found');
    });

    server.listen(PORT, () => {
      const url = `http://localhost:${PORT}`;
      console.log(`\n${paint.info('Auth UI running at')} ${paint.bold(url)}`);
      console.log(paint.dim('Opening browser... Press Ctrl+C or click "Close server" when done.\n'));
      openBrowser(url);
    });

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.log(paint.warn(`Port ${PORT} in use. Open http://localhost:${PORT} manually.`));
        openBrowser(`http://localhost:${PORT}`);
      } else {
        console.log(paint.error(e.message));
        resolve();
      }
    });

    process.on('SIGINT', () => { server.close(); resolve(); });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
