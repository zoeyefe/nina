import fs from 'fs';
import path from 'path';
import os from 'os';

const MEMORY_DIR = path.join(os.homedir(), '.nina', 'memory');
const SESSIONS_DIR = path.join(os.homedir(), '.nina', 'sessions');

export function saveSession(sessionId, history, provider, model, cwd) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  fs.writeFileSync(path.join(SESSIONS_DIR, `${sessionId}.json`), JSON.stringify({
    sessionId, provider, model, cwd,
    history: history.slice(-60),
    savedAt: new Date().toISOString(),
  }));
}

export function loadSession(sessionId) {
  try { return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, `${sessionId}.json`), 'utf8')); }
  catch { return null; }
}

export function listSessions() {
  try {
    return fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => { try { return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8')); } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  } catch { return []; }
}

function memoryFile(projectKey) {
  return path.join(MEMORY_DIR, `${projectKey}.json`);
}

function slug(cwd) {
  return cwd.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase().slice(-40);
}

export function loadMemory(cwd) {
  const file = memoryFile(slug(cwd));
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { notes: [], summary: '' };
  }
}

export function saveMemory(cwd, data) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  fs.writeFileSync(memoryFile(slug(cwd)), JSON.stringify(data, null, 2));
}

export function addNote(cwd, note) {
  const mem = loadMemory(cwd);
  mem.notes = mem.notes || [];
  mem.notes.push({ ts: new Date().toISOString(), text: note });
  // Keep last 100 notes
  if (mem.notes.length > 100) mem.notes = mem.notes.slice(-100);
  saveMemory(cwd, mem);
}

export function saveSummary(cwd, summary, sessionId) {
  const mem = loadMemory(cwd);
  mem.summary = summary;
  mem.lastSession = new Date().toISOString();
  if (sessionId) mem.lastSessionId = sessionId;
  saveMemory(cwd, mem);
}

export function loadBySessionId(sessionId) {
  try {
    const files = fs.readdirSync(MEMORY_DIR);
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(MEMORY_DIR, f), 'utf8'));
      if (data.lastSessionId === sessionId) return data;
    }
  } catch {}
  return null;
}

export function getMemoryContext(cwd) {
  const mem = loadMemory(cwd);
  const parts = [];
  if (mem.summary) parts.push(`Previous session summary: ${mem.summary}`);
  if (mem.notes?.length) {
    const recent = mem.notes.slice(-5);
    parts.push('Recent notes:\n' + recent.map(n => `- ${n.text}`).join('\n'));
  }
  return parts.join('\n\n');
}

export async function buildSessionSummary(history, sendMessage) {
  if (!history.length) return '';
  const convo = history.slice(-20).map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n');
  try {
    return await sendMessage(
      `Summarize this conversation in 3-5 bullet points for future reference:\n\n${convo}`,
      { raw: true }
    );
  } catch {
    return '';
  }
}
