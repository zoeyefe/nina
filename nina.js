#!/usr/bin/env node
import path from 'path';
import fs from 'fs';

import { config } from './auth/config.js';
import { runSetupWizard } from './auth/setup-wizard.js';
import { showBanner, getPrompt, printAIHeader, printAIFooter } from './ui/banner.js';
import { createHash } from 'crypto';
import { paint, c } from './ui/colors.js';
import { interactivePrompt } from './ui/input.js';
import { callProvider } from './providers/index.js';
import { buildSystemPrompt } from './core/system-prompt.js';
import { parseActions, stripActions, executeActions, undoLast } from './core/executor.js';
import { getCommands } from './core/commands.js';
import { loadMemory, saveSummary, getMemoryContext, buildSessionSummary, saveSession as saveSessionData, loadSession, listSessions } from './memory/index.js';
import { plugins, loadUserPlugins } from './plugins/index.js';

const state = {
  provider: config.get('provider', 'anthropic'),
  model:    config.get('model', 'claude-sonnet-4-6'),
  cwd:      process.cwd(),
  history:  [],
  inputHistory: [],
  openFiles: [],
  undoStack: [],
  autorun:  false,
  memory:   {},
  plugins,
  userPlugins: [],   // third-party plugins loaded from ~/.nina/plugins
  btwNotes: [],      // /btw side notes injected into next message
  abortCtrl: null,
  sessionId: createHash('sha1').update(Date.now().toString()).digest('hex').slice(0, 8),
};

state.sendMessage    = sendMessage;
state.executeActions = (actions, cwd, stack) => executeActions(actions, cwd, stack, state.autorun);

// Keep stdin open and in raw mode for the entire session
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

async function sendMessage(userText, opts = {}) {
  const apiKey = config.getKey(state.provider);
  if (!apiKey && state.provider !== 'ollama')
    throw new Error(`No API key for "${state.provider}". Run /auth web`);

  // Inject /btw notes into the message
  let fullText = userText;
  if (!opts.raw) {
    if (state.btwNotes.length) {
      fullText += '\n\n[Side notes: ' + state.btwNotes.join(' | ') + ']';
      state.btwNotes = [];
    }
    fullText += '\n\n[REMINDER: Use WRITE_FILE: filename\\n```\\ncontent\\n``` to create/edit files. Never use markdown code blocks for file content.]';
  }

  const system = buildSystemPrompt(state.cwd, state.openFiles, getMemoryContext(state.cwd));
  const messages = [...state.history, { role: 'user', content: fullText }];

  state.abortCtrl = new AbortController();
  let response;
  if (opts.raw) {
    response = await callProvider(state.provider, state.model, messages, system, apiKey, null, state.abortCtrl.signal);
  } else {
    printAIHeader(state.provider, state.model);

    let buf = '';
    let inputBuf = '';
    let streamLineBuf = '';
    let inActionBlock = false;
    let inCodeFence = false;
    const INPUT_PREFIX = `\n${c.dim}[ESC=stop | type /btw ...]${c.reset} `;

    const onKey = (data) => {
      const k = data.toString('utf8');
      if (k === '\x1b') { state.abortCtrl.abort(); return; }
      if (k === '\x03') { state.abortCtrl.abort(); process.exit(0); }
      if (k === '\r') {
        const line = inputBuf.trim();
        inputBuf = '';
        // Erase the input line
        process.stdout.write('\r\x1b[2K');
        if (line.startsWith('/btw ')) {
          const note = line.slice(5).trim();
          state.btwNotes.push(note);
          process.stdout.write(`${c.dim}  [btw saved: ${note}]${c.reset}\n`);
        } else if (line === '/stop') {
          state.abortCtrl.abort();
        }
        return;
      }
      if (k === '\x7f') {
        inputBuf = inputBuf.slice(0, -1);
      } else if (k >= ' ') {
        inputBuf += k;
      }
      // Redraw input line at current position
      process.stdout.write(`\r\x1b[2K${c.dim}> ${c.reset}${inputBuf}`);
    };

    process.stdin.on('data', onKey);

    try {
      response = await callProvider(
        state.provider, state.model, messages, system, apiKey,
        (chunk) => {
          buf += chunk;
          streamLineBuf += chunk;
          const lines = streamLineBuf.split('\n');
          streamLineBuf = lines.pop();
          for (const line of lines) {
            if (/^(WRITE_FILE|RUN_CMD|DELETE_FILE):\s*\S/.test(line)) {
              inActionBlock = true; inCodeFence = false;
              process.stdout.write('\r\x1b[2K');
            } else if (/^```/.test(line)) {
              if (inActionBlock) {
                if (inCodeFence) { inActionBlock = false; inCodeFence = false; }
                else inCodeFence = true;
              } else {
                // standalone code fence — hide content, show placeholder once
                inActionBlock = true; inCodeFence = true;
                process.stdout.write('\r\x1b[2K');
              }
            } else if (!inActionBlock) {
              process.stdout.write('\r\x1b[2K' + line + '\n');
            }
          }
          if (!inActionBlock) process.stdout.write('\r\x1b[2K' + streamLineBuf);
        },
        state.abortCtrl.signal
      ).catch(e => e.name === 'AbortError' ? buf : Promise.reject(e));
    } finally {
      process.stdin.removeListener('data', onKey);
      if (inputBuf) process.stdout.write('\r\x1b[2K');
    }

    process.stdout.write('\n');
    printAIFooter();
  }
  state.abortCtrl = null;

  if (!opts.raw) {
    state.history.push({ role: 'user', content: fullText });
    state.history.push({ role: 'assistant', content: response });
    if (state.history.length > 30) state.history = state.history.slice(-30);
  }
  return response;
}

async function providerSelectScreen() {
  const result = await runSetupWizard();
  state.provider = result.provider;
  state.model    = result.model;
  state.history  = [];
}

process.on('SIGINT', async () => {
  if (state.abortCtrl) { state.abortCtrl.abort(); return; }
  process.stdout.write('\n');
  await saveSession();
  process.exit(0);
});

async function main() {
  const loadedUserPlugins = await loadUserPlugins();
  state.userPlugins = loadedUserPlugins;
  for (const p of loadedUserPlugins) state.plugins[p.name] = p;

  if (config.isFirstRun()) await providerSelectScreen();

  while (true) {
    const mem = loadMemory(state.cwd);
    state.memory = mem;
    showBanner(state.provider, state.model);
    process.stdout.write(`${c.dim}  Session ${c.reset}${c.cyan}${state.sessionId}${c.reset}\n\n`);

    const commands = getCommands(state);

    commands['/disconnect'] = async () => {
      await saveSession();
      state.history = []; state.openFiles = [];
      await providerSelectScreen();
      throw { __disconnect: true };
    };

    commands['/btw'] = (args) => {
      if (!args.trim()) { console.log(paint.warn('Usage: /btw <note>')); return; }
      state.btwNotes.push(args.trim());
      console.log(paint.dim(`  Note saved — will be added to your next message.`));
    };

    commands['/stop'] = () => {
      if (state.abortCtrl) { state.abortCtrl.abort(); console.log('\n' + paint.warn('Stopped.')); }
      else console.log(paint.dim('Nothing running.'));
    };

    commands['/session'] = (args) => {
      const id = args.trim();
      if (!id) {
        // list sessions
        const sessions = listSessions().slice(0, 10);
        if (!sessions.length) { console.log(paint.dim('No saved sessions.')); return; }
        console.log(`\n${paint.bold('Saved sessions:')}\n`);
        for (const s of sessions) {
          const date = new Date(s.savedAt).toLocaleString();
          const msgs = s.history?.length || 0;
          console.log(`  ${c.cyan}${s.sessionId}${c.reset}  ${paint.dim(date)}  ${paint.dim(`${msgs} messages`)}  ${paint.dim(s.model || '')}`);
        }
        console.log(`\n${paint.dim('/session <id> to resume')}\n`);
        return;
      }
      const session = loadSession(id);
      if (!session) { console.log(paint.warn(`Session ${id} not found.`)); return; }
      saveSession(); // save current first
      state.history = session.history || [];
      state.sessionId = id;
      state.provider = session.provider || state.provider;
      state.model = session.model || state.model;
      console.log(paint.success(`Resumed session ${id} (${state.history.length} messages)`));
    };

    let disconnected = false;
    while (true) {
      let input;
      try {
        const promptStr = getPrompt(state.provider, state.model, state.cwd) +
          (state.btwNotes.length ? paint.dim(` [${state.btwNotes.length} btw]`) + ' ' : '');
        input = await interactivePrompt(promptStr, state.inputHistory);
      } catch (e) {
        if (e?.__disconnect) { disconnected = true; break; }
        throw e;
      }

      input = input.trim();
      if (!input) continue;

      if (state.inputHistory[state.inputHistory.length - 1] !== input) {
        state.inputHistory.push(input);
        if (state.inputHistory.length > 200) state.inputHistory.shift();
      }

      if (input.startsWith('/')) {
        const [cmd, ...rest] = input.split(/\s+/);
        const args = rest.join(' ');
        if (cmd === '/undo') { undoLast(state.undoStack); continue; }
        const fn = commands[cmd];
        if (fn) {
          try { await fn(args); }
          catch (e) { if (e?.__disconnect) { disconnected = true; break; } console.log(paint.error(e.message)); }
        } else {
          console.log(paint.warn(`Unknown command: ${paint.bold(cmd)} — type ${paint.info('/help')}`));
        }
        continue;
      }

      // AI message — streaming
      try {
        const response = await sendMessage(input);
        const actions = parseActions(response);
        if (actions.length) {
          let report = await executeActions(actions, state.cwd, state.undoStack, state.autorun);
          let failures = report?.failures || [];

          for (let attempt = 1; attempt <= 2 && failures.length; attempt++) {
            console.log(paint.warn(`Auto-fix attempt ${attempt}/2 (${failures.length} issue${failures.length > 1 ? 's' : ''})`));

            const failureText = failures.map((f) => {
              if (f.type === 'cmd') return `- RUN_CMD: ${f.command}\n  Error: ${f.error}`;
              if (f.type === 'delete') return `- DELETE_FILE: ${f.path}\n  Error: ${f.error}`;
              return `- ${JSON.stringify(f)}`;
            }).join('\n');

            const fixPrompt = `The previous action execution had errors.

User request:
${input}

Failed items:
${failureText}

Return ONLY corrective actions using WRITE_FILE / RUN_CMD / DELETE_FILE.
Rules:
- Minimal changes only.
- If a command failed, try an alternative command/method.
- If nothing can be fixed safely, respond exactly: NO_FIX`;

            const fixResponse = await sendMessage(fixPrompt, { raw: true });
            if (!fixResponse || /^\s*NO_FIX\s*$/i.test(fixResponse.trim())) break;

            const fixActions = parseActions(fixResponse);
            if (!fixActions.length) break;

            report = await executeActions(fixActions, state.cwd, state.undoStack, state.autorun);
            failures = report?.failures || [];
          }
        }
        plugins.tts.speak(stripActions(response));
      } catch (e) {
        if (e.name !== 'AbortError') console.log(paint.error(`\n✗ ${e.message}\n`));
      }
      await new Promise(r => setImmediate(r));
    }

    if (!disconnected) break;
  }

  await saveSession();
  console.log(paint.dim('Goodbye!\n'));
  process.exit(0);
}

async function saveSession() {
  if (!state.history.length) return;
  try {
    saveSessionData(state.sessionId, state.history, state.provider, state.model, state.cwd);
  } catch {}
}

main().catch(e => { console.error(paint.error('Fatal: ' + e.message)); process.exit(1); });
