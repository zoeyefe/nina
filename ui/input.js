import { c } from './colors.js';
import { PROVIDERS } from '../providers/index.js';

export const COMMANDS = [
  { name: '/help',       hint: 'Show all commands' },
  { name: '/use',        hint: '<provider> [model]' },
  { name: '/auth',       hint: 'web | add | oauth | remove | list' },
  { name: '/disconnect', hint: 'Return to provider selection' },
  { name: '/btw',       hint: '<note> — side note for next message' },
  { name: '/stop',      hint: 'Stop current AI response' },
  { name: '/session',   hint: '[id] — list or resume a saved session' },
  { name: '/tasks',      hint: '<goal> — plan & execute' },
  { name: '/team',       hint: '<goal> — multi-agent auto team' },
  { name: '/multi',      hint: '<prompt> — all providers in parallel' },
  { name: '/open',       hint: '<file> — add to context' },
  { name: '/memory',     hint: 'Show session memory' },
  { name: '/search',     hint: '<query> — web search' },
  { name: '/run',        hint: '<command> — run shell' },
  { name: '/ls',         hint: '[dir] — list directory' },
  { name: '/cd',         hint: '<dir> — change directory' },
  { name: '/status',     hint: 'Show current config' },
  { name: '/providers',  hint: 'List all providers' },
  { name: '/undo',       hint: 'Undo last file change' },
  { name: '/autorun',    hint: 'Toggle auto-apply mode' },
  { name: '/reset',      hint: 'Clear conversation history' },
  { name: '/clear',      hint: 'Clear screen' },
  { name: '/exit',       hint: 'Quit Nina' },
  { name: '/browser',    hint: 'launch|go|shot|eval|tabs|close' },
  { name: '/system',     hint: 'info|open|clip|copy|shot|notify|ps|kill' },
  { name: '/debug',      hint: 'ports|port|log|test|ping' },
  { name: '/daemon',     hint: 'schedule|watch|list|cancel' },
];

const COMMAND_SET = new Set(COMMANDS.map(c => c.name));

const SUBCOMMANDS = {
  '/auth': ['web', 'add', 'oauth', 'remove', 'list'],
  '/browser': ['launch', 'connect', 'go', 'shot', 'eval', 'tabs', 'close'],
  '/system': ['info', 'open', 'clip', 'copy', 'shot', 'notify', 'ps', 'kill'],
  '/debug': ['ports', 'port', 'log', 'test', 'ping', 'scan'],
  '/daemon': ['list', 'schedule', 'watch', 'cancel'],
};

function argSuggestionItems(input) {
  const hasTrailingSpace = /\s$/.test(input);
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0];
  if (!COMMAND_SET.has(cmd)) return [];

  // Global rule: if only command name is typed, don't force arg suggestions yet.
  // User can type a space and continue freely.
  if (!hasTrailingSpace && parts.length === 1) return [];

  // /use provider + model suggestions
  if (cmd === '/use') {
    if (parts.length === 1 || (parts.length === 2 && !hasTrailingSpace)) {
      const q = (parts[1] || '').toLowerCase();
      return Object.keys(PROVIDERS)
        .filter(p => p.toLowerCase().startsWith(q))
        .map(p => ({
          name: `${cmd} ${p}`,
          hint: `provider${PROVIDERS[p]?.defaultModel ? ` · default ${PROVIDERS[p].defaultModel}` : ''}`,
        }));
    }

    const provider = parts[1];
    const models = PROVIDERS[provider]?.models || [];
    const modelQuery = hasTrailingSpace ? '' : (parts[2] || '').toLowerCase();
    return models
      .filter(m => m.toLowerCase().startsWith(modelQuery))
      .map(m => ({ name: `${cmd} ${provider} ${m}`, hint: 'model' }));
  }

  // /auth suggestions
  if (cmd === '/auth') {
    const authParts = SUBCOMMANDS['/auth'];
    if (parts.length === 1 || (parts.length === 2 && !hasTrailingSpace)) {
      const q = (parts[1] || '').toLowerCase();
      return authParts
        .filter(s => s.startsWith(q))
        .map(s => ({ name: `${cmd} ${s}`, hint: 'subcommand' }));
    }
    if (parts[1] === 'oauth') {
      const q = hasTrailingSpace ? '' : (parts[2] || '').toLowerCase();
      return ['google', 'github']
        .filter(s => s.startsWith(q))
        .map(s => ({ name: `${cmd} oauth ${s}`, hint: 'provider' }));
    }
    if (parts[1] === 'add' || parts[1] === 'remove') {
      const q = hasTrailingSpace ? '' : (parts[2] || '').toLowerCase();
      return Object.keys(PROVIDERS)
        .filter(p => p.toLowerCase().startsWith(q))
        .map(p => ({ name: `${cmd} ${parts[1]} ${p}`, hint: 'provider' }));
    }
    return [];
  }

  // Generic subcommand suggestions
  if (SUBCOMMANDS[cmd]) {
    if (parts.length === 1 || (parts.length === 2 && !hasTrailingSpace)) {
      const q = (parts[1] || '').toLowerCase();
      return SUBCOMMANDS[cmd]
        .filter(s => s.startsWith(q))
        .map(s => ({ name: `${cmd} ${s}`, hint: 'subcommand' }));
    }
  }

  return [];
}

const MAX = 8;
const W = process.stdout.columns || 80;

export function interactivePrompt(promptStr, history = []) {
  return new Promise((resolve) => {
    let input = '';
    let histIdx = history.length;
    let items = [];
    let sel = 0;
    let offset = 0;
    let pickerLines = 0;

    const out = (s) => process.stdout.write(s);

    function getItems() {
      if (!input.startsWith('/')) return [];

      // /team is free-form: never show command list while user types goal text.
      if (/^\/team\s/.test(input)) return [];

      const argItems = argSuggestionItems(input);
      if (argItems.length) return argItems;

      // If exact command is typed, hide command picker (lets user continue args freely).
      if (COMMAND_SET.has(input.trim())) return [];

      const q = input.toLowerCase();
      const hits = COMMANDS.filter(cmd => cmd.name.startsWith(q));
      return hits.length ? hits : COMMANDS;
    }

    function redraw() {
      items = getItems();
      const shown = items.slice(0, MAX);

      // Go to start of line, erase everything below
      out('\r\x1b[J');
      out(promptStr + input);

      if (!shown.length) {
        if (/^\/team\s/.test(input)) {
          pickerLines = 2;
          out(`\n  ${c.dim}${'─'.repeat(48)}${c.reset}`);
          out(`\n  ${c.dim}type what you want${c.reset}`);
          out(`\x1b[${pickerLines}A\r` + promptStr + input);
          return;
        }
        pickerLines = 0;
        return;
      }

      // Clamp offset so sel is always visible
      if (sel < offset) offset = sel;
      if (sel >= offset + MAX) offset = sel - MAX + 1;
      const visible = items.slice(offset, offset + MAX);

      pickerLines = visible.length + 1;
      const more = items.length - offset - visible.length;
      const above = offset;
      out(`\n  ${c.dim}${'─'.repeat(48)}${c.reset}`);
      if (above > 0) { out(`\n  ${c.dim}↑ ${above} more above${c.reset}`); pickerLines++; }
      visible.forEach((item, i) => {
        const absIdx = offset + i;
        out('\n' + (absIdx === sel
          ? `  ${c.cyan}❯${c.reset} ${c.bold}${item.name.padEnd(15)}${c.reset}${c.dim}${item.hint}${c.reset}`
          : `    ${c.dim}${item.name.padEnd(15)}${item.hint}${c.reset}`
        ));
      });
      if (more > 0) { out(`\n  ${c.dim}↓ ${more} more below${c.reset}`); pickerLines++; }

      // Move cursor back up to input line
      out(`\x1b[${pickerLines}A\r` + promptStr + input);
    }

    function clearPicker() {
      if (pickerLines > 0) {
        out(`\x1b[${pickerLines}B\r\x1b[J`);
        out(`\x1b[${pickerLines}A`);
        pickerLines = 0;
      }
    }

    function done(line) {
      clearPicker();
      out('\n');
      process.stdin.removeListener('data', onData);
      resolve(line);
    }

    function onData(buf) {
      const key = buf.toString('utf8');

      if (key === '\x03') { clearPicker(); out('\n'); process.exit(0); }

      // Enter
      if (key === '\r') {
        if (items.length && input === '/') {
          input = items[sel].name + ' ';
          sel = 0; redraw(); return;
        }
        done(input.trim()); return;
      }

      // Tab → fill top match
      if (key === '\t') {
        if (items.length) { input = items[sel].name + ' '; sel = 0; offset = 0; redraw(); }
        return;
      }

      // ESC
      if (key === '\x1b') { items = []; redraw(); return; }

      // Arrow UP
      if (key === '\x1b[A') {
        if (items.length) {
          sel = (sel - 1 + items.length) % items.length;
          redraw();
        } else if (histIdx > 0) {
          histIdx--;
          input = history[histIdx] || '';
          redraw();
        }
        return;
      }

      // Arrow DOWN
      if (key === '\x1b[B') {
        if (items.length) {
          sel = (sel + 1) % items.length;
          redraw();
        } else {
          histIdx = Math.min(histIdx + 1, history.length);
          input = history[histIdx] || '';
          redraw();
        }
        return;
      }

      // Backspace
      if (key === '\x7f' || key === '\x08') {
        input = input.slice(0, -1);
        sel = 0; redraw(); return;
      }

      // Ctrl+U — clear line
      if (key === '\x15') { input = ''; sel = 0; redraw(); return; }

      // Printable
      if (key.length === 1 && key >= ' ') {
        input += key;
        sel = 0; redraw();
      }
    }

    if (!process.stdin.isRaw && process.stdin.isTTY) process.stdin.setRawMode(true);
    if (!process.stdin.readableFlowing) process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', onData);
    out(promptStr);
  });
}
