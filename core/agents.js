import { paint, c } from '../ui/colors.js';
import { config } from '../auth/config.js';
import { callProvider } from '../providers/index.js';
import { buildSystemPrompt } from './system-prompt.js';
import { getMemoryContext } from '../memory/index.js';

const PLAN_TIMEOUT_MS = 45000;
const WORKER_TIMEOUT_MS = 60000;
const LEAD_TIMEOUT_MS = 120000;

function stripAnsi(s = '') {
  return String(s).replace(/\x1b\[[0-9;]*m/g, '');
}

function oneLine(s = '') {
  return stripAnsi(String(s)).replace(/\s+/g, ' ').trim();
}

function trunc(s = '', max = 80) {
  const t = oneLine(s);
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)) + '…';
}

function visibleLen(s = '') {
  return stripAnsi(String(s)).length;
}

function padAnsi(s = '', width = 0) {
  const txt = String(s);
  const len = visibleLen(txt);
  if (len >= width) return txt;
  return txt + ' '.repeat(width - len);
}

function createTeamMonitor(goal) {
  const entries = [
    { key: 'planner', role: 'Team Planner', status: 'queued', note: '', startedAt: 0, endedAt: 0, user: '', assistant: '', stream: '' },
    { key: 'lead', role: 'Team Lead', status: 'queued', note: '', startedAt: 0, endedAt: 0, user: '', assistant: '', stream: '' },
  ];

  let interval = null;
  let linesPrinted = 0;

  const icon = (status) => {
    if (status === 'running') return `${c.yellow}●${c.reset}`;
    if (status === 'done') return `${c.green}●${c.reset}`;
    if (status === 'failed') return `${c.red}●${c.reset}`;
    return `${c.dim}●${c.reset}`;
  };

  const statusText = (status) => {
    if (status === 'running') return paint.warn('running');
    if (status === 'done') return paint.success('done');
    if (status === 'failed') return paint.error('failed');
    return paint.dim('queued');
  };

  const elapsed = (e) => {
    if (!e.startedAt) return '--';
    const end = e.endedAt || Date.now();
    const sec = Math.max(0, Math.round((end - e.startedAt) / 1000));
    return `${sec}s`;
  };

  const upsert = (key, role) => {
    let e = entries.find(x => x.key === key);
    if (!e) {
      e = { key, role, status: 'queued', note: '', startedAt: 0, endedAt: 0, user: '', assistant: '', stream: '' };
      const leadIdx = entries.findIndex(x => x.key === 'lead');
      if (leadIdx >= 0) entries.splice(leadIdx, 0, e);
      else entries.push(e);
    }
    return e;
  };

  const render = () => {
    const termW = Math.max(80, Math.min(process.stdout.columns || 120, 220));
    const cols = Math.max(1, entries.length); // one column per agent
    const gap = ' ';
    const cellW = Math.max(18, Math.floor((termW - ((cols - 1) * gap.length)) / cols));

    const cardFor = (e) => {
      const aiText = e.status === 'running' ? (e.stream || e.assistant || e.note) : (e.assistant || e.note);
      const inner = Math.max(16, cellW - 2);
      const top = `┌${'─'.repeat(inner)}┐`;
      const l1 = `│${padAnsi(trunc(`${icon(e.status)} ${e.role}`, inner), inner)}│`;
      const l2 = `│${padAnsi(trunc(`${statusText(e.status)} (${elapsed(e)})`, inner), inner)}│`;
      const l3 = `│${padAnsi(trunc(`U> ${e.user || '(prompt yok)'}`, inner), inner)}│`;
      const l4 = `│${padAnsi(trunc(`A> ${aiText || '(cevap bekleniyor)'}`, inner), inner)}│`;
      const l5 = `│${padAnsi(trunc(`N> ${e.note || '-'}`, inner), inner)}│`;
      const bot = `└${'─'.repeat(inner)}┘`;
      return [top, l1, l2, l3, l4, l5, bot];
    };

    const cards = entries.map(cardFor);
    const cardH = cards[0]?.length || 0;

    const lines = [
      `${c.dim}${'─'.repeat(termW)}${c.reset}`,
      `${paint.bold('TEAM MONITOR')} ${paint.dim(`· ${cols} agent column(s) live feed`)}`,
      `${paint.dim('Goal:')} ${trunc(goal, termW - 10)}`,
      `${c.dim}${'─'.repeat(termW)}${c.reset}`,
    ];

    for (let i = 0; i < cardH; i++) {
      lines.push(cards.map(card => card[i]).join(gap));
    }

    lines.push(`${c.dim}${'─'.repeat(termW)}${c.reset}`);

    if (linesPrinted > 0) process.stdout.write(`\x1b[${linesPrinted}A`);
    process.stdout.write('\r\x1b[J' + lines.join('\n') + '\n');
    linesPrinted = lines.length;
  };

  const set = (key, patch) => {
    const e = upsert(key, patch.role || key);
    if (!e) return;
    Object.assign(e, patch);
    render();
  };

  return {
    setWorkerRoles(roles = []) {
      for (const r of roles) upsert(`worker:${r.role}`, r.role);
      render();
    },
    start() {
      render();
      interval = setInterval(render, 250);
    },
    stop() {
      if (interval) clearInterval(interval);
      interval = null;
      render();
      process.stdout.write('\n');
    },
    plannerRunning(prompt) { set('planner', { role: 'Team Planner', status: 'running', startedAt: Date.now(), endedAt: 0, note: 'plan çıkarıyor', user: prompt, assistant: '', stream: '' }); },
    plannerChunk(chunk) {
      const e = upsert('planner', 'Team Planner');
      e.stream = (e.stream + (chunk || '')).slice(-2000);
    },
    plannerDone(output) { set('planner', { status: 'done', endedAt: Date.now(), note: 'plan hazır', assistant: output, stream: '' }); },
    plannerFailed(reason) { set('planner', { status: 'failed', endedAt: Date.now(), note: reason, stream: '' }); },

    workerRunning(role, prompt) { set(`worker:${role}`, { role, status: 'running', startedAt: Date.now(), endedAt: 0, note: '', user: prompt, assistant: '', stream: '' }); },
    workerChunk(role, chunk) {
      const e = upsert(`worker:${role}`, role);
      e.stream = (e.stream + (chunk || '')).slice(-2000);
    },
    workerDone(role, output) { set(`worker:${role}`, { status: 'done', endedAt: Date.now(), note: 'tamamlandı', assistant: output, stream: '' }); },
    workerFailed(role, reason) { set(`worker:${role}`, { status: 'failed', endedAt: Date.now(), note: reason, stream: '' }); },

    leadRunning(prompt) { set('lead', { role: 'Team Lead', status: 'running', startedAt: Date.now(), endedAt: 0, note: 'sentez', user: prompt, assistant: '', stream: '' }); },
    leadChunk(chunk) {
      const e = upsert('lead', 'Team Lead');
      e.stream = (e.stream + (chunk || '')).slice(-2000);
    },
    leadDone(output) { set('lead', { status: 'done', endedAt: Date.now(), note: 'final hazır', assistant: output, stream: '' }); },
    leadFailed(reason) { set('lead', { status: 'failed', endedAt: Date.now(), note: reason, stream: '' }); },
  };
}

function cleanJson(text = '') {
  return text
    .replace(/^```[\w-]*\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();
}

function parseJsonOrNull(text) {
  const cleaned = cleanJson(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
    }
    return null;
  }
}

function fallbackPlan(goal) {
  return {
    objective: goal,
    roles: [
      { id: 'planner', role: 'Planner', focus: 'Kapsam, teknik yön ve görev kırılımı' },
      { id: 'implementer', role: 'Implementer', focus: 'Gerekli kod/değişikliklerin uygulanması' },
      { id: 'validator', role: 'Validator', focus: 'Test, risk ve doğrulama planı' }
    ],
    milestones: [
      'Kapsam ve görev ayrımı',
      'Paralel uygulama önerileri',
      'Birleşik uygulama planı ve uygulanacak aksiyonlar'
    ]
  };
}

async function askAgent(state, prompt, opts = {}) {
  const { extraSystem = '', onChunk = null, signal } = opts;
  const apiKey = config.getKey(state.provider);
  if (!apiKey && state.provider !== 'ollama') {
    throw new Error(`No API key for "${state.provider}". Run /auth web`);
  }

  const baseSystem = buildSystemPrompt(state.cwd, state.openFiles, getMemoryContext(state.cwd));
  const mergedSystem = [baseSystem, extraSystem].filter(Boolean).join('\n\n');
  return callProvider(
    state.provider,
    state.model,
    [{ role: 'user', content: prompt }],
    mergedSystem,
    apiKey,
    onChunk,
    signal
  );
}

async function askAgentWithTimeout(state, prompt, opts = {}) {
  const { extraSystem = '', timeoutMs = WORKER_TIMEOUT_MS, onChunk = null } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await askAgent(state, prompt, { extraSystem, onChunk, signal: ctrl.signal });
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error(`Agent timeout after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function buildFallbackFinal(goal, plan, workerOutputs) {
  const done = workerOutputs.filter(w => !String(w.output || '').startsWith('SKIPPED:')).map(w => w.role);
  const skipped = workerOutputs.filter(w => String(w.output || '').startsWith('SKIPPED:')).map(w => w.role);

  return [
    `Takım planı hazır (fallback mod).`,
    `Hedef: ${goal}`,
    `Roller: ${(plan.roles || []).map(r => r.role).join(', ') || 'N/A'}`,
    done.length ? `Tamamlanan roller: ${done.join(', ')}` : 'Tamamlanan rol yok.',
    skipped.length ? `Atlanan roller: ${skipped.join(', ')}` : '',
    '',
    'İstersen şimdi bu plana göre implementasyona geçiyorum.',
    'Önerilen ilk adım: proje iskeletini oluşturup temel sayfaları ve API uçlarını eklemek.',
  ].filter(Boolean).join('\n');
}

export async function runAgentTeam(goal, state) {
  console.log(`\n${paint.info('Team mode:')} ${goal}`);

  const monitor = createTeamMonitor(goal);
  monitor.start();

  const managerPlanPrompt = `Sen bir engineering manager'sın. Amaç: "${goal}".

JSON dışında hiçbir şey yazma. Şu şemayı doldur:
{
  "objective": "...",
  "roles": [
    { "id": "role-id", "role": "Role Name", "focus": "..." }
  ],
  "milestones": ["...", "...", "..."]
}

Kurallar:
- 3-5 rol ver.
- Rolleri kullanıcı cümlesine göre tamamen sen seç.
- Kullanıcıdan frontend/backend gibi rol bilgisi bekleme.
- Kullanıcı talebine uygun olmayan rol ekleme.
- Kısa ve net yaz.`;

  let plan = fallbackPlan(goal);
  let rawPlanText = '';
  try {
    monitor.plannerRunning(managerPlanPrompt);
    const rawPlan = await askAgentWithTimeout(state, managerPlanPrompt, {
      extraSystem: 'You are the Team Planner agent.',
      timeoutMs: PLAN_TIMEOUT_MS,
      onChunk: (chunk) => monitor.plannerChunk(chunk),
    });
    rawPlanText = rawPlan;
    const parsed = parseJsonOrNull(rawPlan);
    if (parsed?.roles?.length) plan = parsed;
    monitor.plannerDone(rawPlanText);
  } catch (e) {
    monitor.plannerFailed(e.message);
  }

  const roles = (plan.roles || []).slice(0, 4);
  monitor.setWorkerRoles(roles);

  const concurrency = state.provider === 'ollama' ? 1 : 2;
  const workerOutputs = [];
  const queue = [...roles];

  async function runOne(workerRole) {
    const workerPrompt = `Takım hedefi: "${goal}"
Rolün: ${workerRole.role}
Odak alanın: ${workerRole.focus || ''}
Milestones: ${(plan.milestones || []).join(' | ')}

Yanıt formatı (düz metin):
ROLE: ${workerRole.role}
PLAN:
- ...
CHANGES:
- hangi dosyalar/komutlar gerekli
RISKS:
- ...
HANDOFF:
- bir sonraki role ne devrediyorsun

Kurallar:
- Kısa, uygulanabilir ve somut ol.
- Bu aşamada WRITE_FILE/RUN_CMD/DELETE_FILE üretme.
- Sadece kendi rol sorumluluğunda kal.`;

    monitor.workerRunning(workerRole.role, workerPrompt);
    try {
      const out = await askAgentWithTimeout(
        state,
        workerPrompt,
        {
          extraSystem: `You are ${workerRole.role} in a multi-agent software team.`,
          timeoutMs: WORKER_TIMEOUT_MS,
          onChunk: (chunk) => monitor.workerChunk(workerRole.role, chunk),
        }
      );
      monitor.workerDone(workerRole.role, out);
      workerOutputs.push({ role: workerRole.role, output: String(out || '').trim() || '(no output)' });
    } catch (e) {
      monitor.workerFailed(workerRole.role, e.message);
      workerOutputs.push({ role: workerRole.role, output: `SKIPPED: ${e.message}` });
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const workerRole = queue.shift();
      if (!workerRole) break;
      await runOne(workerRole);
    }
  });
  await Promise.all(runners);

  const synthesisPrompt = `Kullanıcı hedefi: "${goal}"

Takım planı:
${JSON.stringify(plan, null, 2)}

Worker çıktıları:
${workerOutputs.map(w => `\n[${w.role}]\n${String(w.output || '').slice(0, 1800)}`).join('\n')}

Şimdi takım lideri olarak tek bir birleşik çıktı üret.
Kurallar:
- Türkçe yaz.
- Kısa bir "takım planı" özeti ver.
- Gerekirse uygulanacak aksiyonları WRITE_FILE / RUN_CMD / DELETE_FILE formatında ekle.
- İstenmeyen iş yapma; sadece hedef için gerekli adımları üret.
- Eğer önce kullanıcıdan kritik bir netleştirme gerekiyorsa tek soru sor.
- En fazla 3500 karakter yaz.
`;

  let final;
  try {
    monitor.leadRunning(synthesisPrompt);
    final = await askAgentWithTimeout(
      state,
      synthesisPrompt,
      {
        extraSystem: 'You are the Team Lead agent. Produce one coordinated final response.',
        timeoutMs: LEAD_TIMEOUT_MS,
        onChunk: (chunk) => monitor.leadChunk(chunk),
      }
    );
    monitor.leadDone(final);
  } catch (e) {
    monitor.leadFailed(e.message);
    final = buildFallbackFinal(goal, plan, workerOutputs);
  }
  monitor.stop();
  return { plan, workerOutputs, final };
}
