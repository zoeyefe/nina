import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { paint, c, hr } from '../ui/colors.js';
import { config } from '../auth/config.js';
import { PROVIDERS } from '../providers/index.js';
import { browserPlugin } from '../plugins/browser.js';
import { systemPlugin } from '../plugins/system.js';
import { debugPlugin } from '../plugins/debug.js';
import { daemonPlugin } from '../plugins/daemon.js';
import { buildExecCommand } from './shell.js';
import { runAgentTeam } from './agents.js';

export function getCommands(state) {
  return {
    '/help': cmdHelp,
    '/providers': () => cmdProviders(state),
    '/use': (args) => cmdUse(args, state),
    '/auth': (args) => cmdAuth(args, state),
    '/memory': () => cmdMemory(state),
    '/tasks': (args) => cmdTasks(args, state),
    '/team': (args) => cmdTeam(args, state),
    '/multi': (args) => cmdMulti(args, state),
    '/plugins': (args) => cmdPlugins(args, state),
    '/open': (args) => cmdOpen(args, state),
    '/ls': (args) => cmdLs(args, state),
    '/cd': (args) => cmdCd(args, state),
    '/run': (args) => cmdRun(args, state),
    '/undo': () => cmdUndo(state),
    '/autorun': () => cmdAutorun(state),
    '/search': (args) => cmdSearch(args, state),
    '/status': () => cmdStatus(state),
    '/reset': () => cmdReset(state),
    '/clear': cmdClear,
    '/exit': cmdExit,
    '/browser': (args) => cmdBrowser(args, state),
    '/system': (args) => cmdSystem(args, state),
    '/debug': (args) => cmdDebug(args, state),
    '/daemon': (args) => cmdDaemon(args, state),
  };
}

function cmdHelp() {
  console.log(`
${paint.bold('Nina CLI — Commands')}
${hr()}
  ${paint.info('/help')}                    This help message
  ${paint.info('/disconnect')}              Return to provider selection screen
  ${paint.info('/btw <note>')}              Add side note to next message (like Claude Code)
  ${paint.info('/stop')}                    Stop current AI response
  ${paint.info('/providers')}               List available providers
  ${paint.info('/use <provider> [model]')}  Switch provider/model
  ${paint.info('/auth web')}                Browser-based auth UI (recommended)
  ${paint.info('/auth add <provider>')}     Add API key from terminal
  ${paint.info('/auth oauth google|github')} OAuth login
  ${paint.info('/auth remove <provider>')} Remove API key
  ${paint.info('/memory')}                  Show session memory
  ${paint.info('/tasks <goal>')}            Plan & execute a goal step by step
  ${paint.info('/team <goal>')}             Multi-agent team mode (roles auto-selected by AI)
  ${paint.info('/multi <prompt>')}          Query all providers in parallel
  ${paint.info('/plugins')}                 List plugins (enable/disable <name>)
  ${paint.info('/open <file>')}             Add file to context
  ${paint.info('/ls [dir]')}                List directory
  ${paint.info('/cd <dir>')}                Change directory
  ${paint.info('/run <command>')}           Run a shell command
  ${paint.info('/undo')}                    Undo last file change
  ${paint.info('/autorun')}                 Toggle auto-apply mode
  ${paint.info('/search <query>')}          Web search (DuckDuckGo)
  ${paint.info('/browser')}                 Browser control (Chrome CDP)
  ${paint.info('/system')}                  PC control: apps, clipboard, screenshot
  ${paint.info('/debug')}                   Debug: ports, logs, tests, ping
  ${paint.info('/daemon')}                  7/24 scheduler & file watcher
  ${paint.info('/status')}                  Show current config
  ${paint.info('/reset')}                   Clear conversation history
  ${paint.info('/clear')}                   Clear screen
  ${paint.info('/exit')}                    Quit
`);
}

function cmdProviders(state) {
  console.log(`\n${paint.bold('Available Providers:')}\n`);
  for (const [id, p] of Object.entries(PROVIDERS)) {
    const hasKey = id === 'ollama' || !!config.getKey(id);
    const active = state.provider === id;
    const status = hasKey ? paint.success('✓') : paint.dim('○');
    const mark = active ? `${c.cyan}❯${c.reset}` : ' ';
    console.log(`  ${mark} ${status} ${paint.bold(id.padEnd(12))} ${paint.dim(p.label)}`);
    if (active) console.log(`      ${paint.dim('Model: ' + state.model)}`);
  }
  console.log();
}

async function cmdUse(args, state) {
  const [providerId, modelId] = args.split(/\s+/);
  if (!providerId) { console.log(paint.warn('Usage: /use <provider> [model]')); return; }
  if (!PROVIDERS[providerId]) { console.log(paint.error(`Unknown provider: ${providerId}`)); return; }

  state.provider = providerId;
  if (modelId) state.model = modelId;
  config.set('provider', state.provider);
  config.set('model', state.model);
  console.log(paint.success(`Switched to ${providerId} / ${state.model}`));
}

async function cmdAuth(args, state) {
  const [sub, target] = args.split(/\s+/);

  if (sub === 'add') {
    if (!target) { console.log(paint.warn('Usage: /auth add <provider>')); return; }
    const readline = (await import('readline')).default;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`  ${paint.info('API Key for ' + target)}: `, (key) => {
      rl.close();
      config.setKey(target, key.trim());
      console.log(paint.success(`Key saved for ${target}`));
    });
  } else if (sub === 'web') {
    const { startWebAuth } = await import('../auth/web-auth.js');
    await startWebAuth();
    // Reload state with potentially changed provider/model
    state.provider = config.get('provider', state.provider);
    state.model = config.get('model', state.model);
    console.log(paint.success(`\nActive: ${state.provider} / ${state.model}`));
  } else if (sub === 'oauth') {
    const { googleOAuth, githubOAuth } = await import('../auth/oauth.js');
    if (target === 'google') await googleOAuth();
    else if (target === 'github') await githubOAuth();
    else console.log(paint.warn('Usage: /auth oauth google|github'));
  } else if (sub === 'remove') {
    if (!target) { console.log(paint.warn('Usage: /auth remove <provider>')); return; }
    config.removeKey(target);
    console.log(paint.success(`Removed key for ${target}`));
  } else if (sub === 'list') {
    const keys = config.listKeys();
    console.log(paint.bold('\nStored credentials:'));
    keys.forEach(k => console.log(`  ${paint.success('✓')} ${k}`));
    if (!keys.length) console.log(paint.dim('  (none)'));
    console.log();
  } else {
    console.log(paint.warn('Usage: /auth add|oauth|remove|list'));
  }
}

function cmdMemory(state) {
  if (!state.memory || !Object.keys(state.memory).length) {
    console.log(paint.dim('\n(No memory stored for this project)\n'));
    return;
  }
  console.log(`\n${paint.bold('Session Memory:')}\n`);
  for (const [k, v] of Object.entries(state.memory)) {
    console.log(`  ${paint.info(k)}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
  console.log();
}

async function cmdTasks(args, state) {
  if (!args.trim()) { console.log(paint.warn('Usage: /tasks <goal>')); return; }
  const { runPlanner } = await import('./planner.js');
  await runPlanner(args.trim(), state.sendMessage, state.executeActions, state.undoStack, state.cwd);
}

async function cmdTeam(args, state) {
  const goal = args.trim();
  if (!goal) { console.log(paint.warn('Usage: /team <goal>')); return; }

  const result = await runAgentTeam(goal, state);
  console.log(`\n${paint.bold('Team Lead:')}\n`);
  console.log(result.final + '\n');

  // Keep /team output in conversational memory so follow-up questions have context.
  state.history.push({ role: 'user', content: `/team ${goal}` });
  state.history.push({ role: 'assistant', content: result.final || '' });
  if (state.history.length > 30) state.history = state.history.slice(-30);

  const { parseActions } = await import('./executor.js');
  const actions = parseActions(result.final || '');
  if (actions.length) {
    let report = await state.executeActions(actions, state.cwd, state.undoStack);
    let failures = report?.failures || [];

    for (let attempt = 1; attempt <= 2 && failures.length; attempt++) {
      console.log(paint.warn(`Team auto-fix attempt ${attempt}/2 (${failures.length} issue${failures.length > 1 ? 's' : ''})`));

      const failureText = failures.map((f) => {
        if (f.type === 'cmd') return `- RUN_CMD: ${f.command}\n  Error: ${f.error}`;
        if (f.type === 'delete') return `- DELETE_FILE: ${f.path}\n  Error: ${f.error}`;
        return `- ${JSON.stringify(f)}`;
      }).join('\n');

      const fixPrompt = `The previous /team action execution had errors.

Goal:
${goal}

Failed items:
${failureText}

Return ONLY corrective actions using WRITE_FILE / RUN_CMD / DELETE_FILE.
Rules:
- Minimal changes only.
- If command failed, try a compatible alternative.
- If no safe fix exists, respond exactly: NO_FIX`;

      const fixResponse = await state.sendMessage(fixPrompt, { raw: true });
      if (!fixResponse || /^\s*NO_FIX\s*$/i.test(fixResponse.trim())) break;

      const fixActions = parseActions(fixResponse);
      if (!fixActions.length) break;

      report = await state.executeActions(fixActions, state.cwd, state.undoStack);
      failures = report?.failures || [];
    }
  }
}

async function cmdMulti(args, state) {
  if (!args.trim()) { console.log(paint.warn('Usage: /multi <prompt>')); return; }
  const { callProvider } = await import('../providers/index.js');
  const providers = Object.keys(PROVIDERS).filter(id => id === 'ollama' || config.getKey(id));

  console.log(`\n${paint.bold('Multi-provider query:')} ${paint.dim(args.trim())}\n`);

  const results = await Promise.allSettled(
    providers.map(async (pid) => {
      const model = PROVIDERS[pid].defaultModel;
      const response = await callProvider(pid, model, [{ role: 'user', content: args.trim() }], null, config.getKey(pid));
      return { pid, model, response };
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled') {
      console.log(`\n${paint.provider('◆ ' + r.value.pid)} ${paint.dim('(' + r.value.model + ')')}`);
      console.log(paint.dim('─'.repeat(50)));
      console.log(r.value.response);
    } else {
      console.log(`\n${paint.error('✗ ' + r.reason?.message)}`);
    }
  }
  console.log();
}

function cmdPlugins(args, state) {
  const [sub, name] = args.trim().split(/\s+/);
  const disabled = config.get('disabledPlugins', []);

  if (sub === 'enable' || sub === 'disable') {
    if (!name) { console.log(paint.warn(`Usage: /plugins ${sub} <name>`)); return; }
    let next = disabled.filter(n => n !== name);
    if (sub === 'disable') next.push(name);
    config.set('disabledPlugins', next);
    console.log(paint.success(`Plugin "${name}" ${sub}d.`));
    return;
  }

  console.log(`\n${paint.bold('Plugins:')}\n`);
  const builtins = state.plugins || {};
  const userPlugins = state.userPlugins || [];
  if (!Object.keys(builtins).length && !userPlugins.length) {
    console.log(paint.dim('  No plugins active. See plugins/index.js\n'));
    return;
  }
  for (const [pname, p] of Object.entries(builtins)) {
    const status = disabled.includes(pname) ? paint.dim('✗ disabled') : paint.success('✓ enabled');
    console.log(`  ${status} ${paint.bold(pname)}: ${paint.dim(p.description || '')}`);
  }
  for (const p of userPlugins) {
    const status = disabled.includes(p.name) ? paint.dim('✗ disabled') : paint.success('✓ enabled');
    console.log(`  ${status} ${paint.bold(p.name)} ${paint.dim('(user plugin)')}`);
  }
  console.log();
}

function cmdOpen(args, state) {
  const filePath = path.resolve(state.cwd, args.trim());
  if (!fs.existsSync(filePath)) { console.log(paint.error(`File not found: ${filePath}`)); return; }
  if (!state.openFiles.includes(filePath)) state.openFiles.push(filePath);
  console.log(paint.success(`Added to context: ${filePath}`));
}

function cmdLs(args, state) {
  const dir = args.trim() ? path.resolve(state.cwd, args.trim()) : state.cwd;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    console.log(`\n${paint.bold(dir)}\n`);
    for (const e of entries) {
      const icon = e.isDirectory() ? paint.info('d') : ' ';
      console.log(`  ${icon} ${e.isDirectory() ? paint.bold(e.name + '/') : e.name}`);
    }
    console.log();
  } catch (e) {
    console.log(paint.error(e.message));
  }
}

function cmdCd(args, state) {
  const newDir = path.resolve(state.cwd, args.trim());
  if (!fs.existsSync(newDir)) { console.log(paint.error(`Directory not found: ${newDir}`)); return; }
  state.cwd = newDir;
  console.log(paint.success(`Now in: ${newDir}`));
}

function cmdRun(args, state) {
  if (!args.trim()) { console.log(paint.warn('Usage: /run <command>')); return; }
  try {
    const out = execSync(buildExecCommand(args.trim()), { cwd: state.cwd, encoding: 'utf8' });
    console.log(out);
  } catch (e) {
    console.log(paint.error(e.stderr || e.message));
  }
}

async function cmdUndo(state) {
  const { undoLast } = await import('./executor.js');
  undoLast(state.undoStack);
}

function cmdAutorun(state) {
  state.autorun = !state.autorun;
  console.log(state.autorun ? paint.warn('⚡ Autorun ON — changes will apply without confirmation.') : paint.success('Autorun OFF — you will be asked before each change.'));
}

async function cmdSearch(args, state) {
  if (!args.trim()) { console.log(paint.warn('Usage: /search <query>')); return; }
  const { webSearch } = await import('../plugins/index.js');
  await webSearch(args.trim());
}

function cmdStatus(state) {
  console.log(`\n${paint.bold('Status:')}`);
  console.log(`  Provider:  ${paint.provider(state.provider)}`);
  console.log(`  Model:     ${paint.info(state.model)}`);
  console.log(`  Directory: ${paint.file(state.cwd)}`);
  console.log(`  Autorun:   ${state.autorun ? paint.warn('ON') : paint.dim('OFF')}`);
  console.log(`  History:   ${state.history.length} messages`);
  console.log(`  Context:   ${state.openFiles.length} open file(s)`);
  console.log();
}

function cmdReset(state) {
  state.history = [];
  state.openFiles = [];
  console.log(paint.success('Conversation reset.'));
}

function cmdClear() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function cmdExit() {
  console.log(paint.dim('\nGoodbye!\n'));
  process.exit(0);
}

async function cmdBrowser(args, state) {
  const [sub, ...rest] = args.trim().split(/\s+/);
  if (!sub || sub === 'help') {
    const cmds = [['launch [url]','Connect Chrome'],['go <url>','Navigate'],['shot [file]','Screenshot'],['eval <js>','Run JS'],['tabs','List tabs'],['close','Disconnect']];
    console.log(`\n${paint.bold('/browser')} — Chrome DevTools Protocol\n`);
    cmds.forEach(([c,h]) => console.log(`  ${paint.info('/browser ' + c.padEnd(16))} ${paint.dim(h)}`));
    console.log();
    return;
  }
  if (sub === 'launch') { await browserPlugin.launch(rest[0] || 'about:blank'); return; }
  if (sub === 'connect') { await browserPlugin.connect(); return; }
  if (sub === 'go') { await browserPlugin.navigate(rest.join(' ')); return; }
  if (sub === 'shot') { await browserPlugin.screenshot(rest[0] || `screenshot-${Date.now()}.png`); return; }
  if (sub === 'eval') { const r = await browserPlugin.eval(rest.join(' ')); console.log(r); return; }
  if (sub === 'tabs') { const t = await browserPlugin.getTabs(); t.forEach(tab => console.log(`  ${paint.info(tab.title)} ${paint.dim(tab.url)}`)); return; }
  if (sub === 'close') { browserPlugin.close(); console.log(paint.dim('Browser disconnected.')); return; }
  console.log(paint.warn(`Unknown: /browser ${sub}`));
}

function cmdSystem(args, state) {
  const [sub, ...rest] = args.trim().split(/\s+/);
  if (!sub) {
    const cmds = [['info','System info (RAM, CPU, uptime)'],['open <path>','Open file/URL/app'],['clip','Read clipboard'],['copy <text>','Write clipboard'],['shot [file]','Screenshot'],['notify <msg>','Desktop notification'],['ps [filter]','Process list'],['kill <pid>','Kill process'],['approval <always|risky-only|never>','Set command/delete approval mode']];
    console.log(`\n${paint.bold('/system')} — PC Control\n`);
    cmds.forEach(([c,h]) => console.log(`  ${paint.info('/system ' + c.padEnd(18))} ${paint.dim(h)}`));
    console.log(); return;
  }
  if (sub === 'approval') {
    const mode = rest[0];
    const valid = ['always', 'risky-only', 'never'];
    if (!valid.includes(mode)) {
      console.log(paint.warn(`Usage: /system approval <${valid.join('|')}>`));
      console.log(paint.dim(`  Current: ${config.get('approvalMode', 'risky-only')}`));
      return;
    }
    config.set('approvalMode', mode);
    console.log(paint.success(`Approval mode set to: ${mode}`));
    return;
  }
  if (sub === 'info') {
    const info = systemPlugin.info();
    console.log(`\n${paint.bold('System Info:')}`);
    for (const [k,v] of Object.entries(info)) console.log(`  ${paint.dim(k.padEnd(10))} ${v}`);
    console.log();
    return;
  }
  if (sub === 'open') { systemPlugin.open(rest.join(' ')); return; }
  if (sub === 'clip') { console.log(systemPlugin.clipboard.read()); return; }
  if (sub === 'copy') { systemPlugin.clipboard.write(rest.join(' ')); console.log(paint.success('Copied to clipboard')); return; }
  if (sub === 'shot') { systemPlugin.screenshot(rest[0]); return; }
  if (sub === 'notify') { systemPlugin.notify('Nina', rest.join(' ')); return; }
  if (sub === 'ps') { const procs = systemPlugin.processes(rest[0]); procs.forEach(p => console.log(`  ${paint.dim(String(p.pid||'').padEnd(6))} ${p.name||p}`)); return; }
  if (sub === 'kill') { systemPlugin.kill(rest[0]); console.log(paint.success(`Killed PID ${rest[0]}`)); return; }
  console.log(paint.warn('Usage: /system info|open|clip|copy|shot|notify|ps|kill'));
}

async function cmdDebug(args, state) {
  const [sub, ...rest] = args.trim().split(/\s+/);
  if (!sub) {
    const cmds = [['ports','List listening ports'],['port <n>','What\'s on port N'],['log <file> [n]','Tail log file'],['test','Run project tests'],['ping <url>','Check URL reachability'],['scan [dir]','Scan logs for errors']];
    console.log(`\n${paint.bold('/debug')} — Diagnostics\n`);
    cmds.forEach(([c,h]) => console.log(`  ${paint.info('/debug ' + c.padEnd(20))} ${paint.dim(h)}`));
    console.log(); return;
  }
  if (sub === 'ports') { const p = debugPlugin.ports(); p.forEach(l => console.log(`  ${paint.dim(l)}`)); return; }
  if (sub === 'port') { console.log(debugPlugin.whatsOnPort(rest[0])); return; }
  if (sub === 'log') { console.log(debugPlugin.tailLog(rest[0], parseInt(rest[1]||'50'))); return; }
  if (sub === 'test') { const r = await debugPlugin.runTests(state.cwd); console.log(r.ok ? paint.success('Tests passed') : paint.error('Tests failed')); console.log(paint.dim(r.output?.slice(0,500))); return; }
  if (sub === 'ping') { const r = await debugPlugin.ping(rest[0]); console.log(r.ok ? paint.success(`${r.status} in ${r.ms}ms`) : paint.error(r.error)); return; }
  console.log(paint.warn('Usage: /debug ports|port <n>|log <file>|test|ping <url>'));
}

function cmdDaemon(args, state) {
  const [sub, ...rest] = args.trim().split(/\s+/);
  if (!sub) {
    const cmds = [['list','Show scheduled tasks'],['schedule <id> <min> <prompt>','Run AI task every N minutes'],['watch <file> [prompt]','Trigger AI on file change'],['cancel <id>','Stop a scheduled task']];
    console.log(`\n${paint.bold('/daemon')} — 7/24 Autonomous Tasks\n`);
    cmds.forEach(([c,h]) => console.log(`  ${paint.info('/daemon ' + c.padEnd(28))} ${paint.dim(h)}`));
    console.log(); return;
  }
  if (sub === 'list') { daemonPlugin.list(); return; }
  if (sub === 'cancel') { daemonPlugin.cancel(rest[0]); return; }
  if (sub === 'watch') {
    const [file, ...promptParts] = rest;
    daemonPlugin.watchFile(file, promptParts.join(' ') || 'Analyze this file change', state.sendMessage);
    return;
  }
  if (sub === 'schedule') {
    // /daemon schedule <id> <minutes> <prompt...>
    const [id, mins, ...promptParts] = rest;
    if (!id || !mins) { console.log(paint.warn('Usage: /daemon schedule <id> <minutes> <prompt>')); return; }
    daemonPlugin.schedule(id, parseInt(mins) * 60000, promptParts.join(' '), state.sendMessage);
    return;
  }
  console.log(paint.warn('Usage: /daemon list|schedule <id> <min> <prompt>|watch <file> [prompt]|cancel <id>'));
}
