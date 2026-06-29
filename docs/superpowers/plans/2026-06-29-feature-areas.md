# Nina 2.0 Feature Areas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 4 feature areas from `docs/superpowers/specs/2026-06-29-nina-2.0-design.md` (provider tool-calling/UX, team blackboard, DX plugin+approval, sandboxed execution).

**Architecture:** 4 independent tasks, no shared files except Task 7 (approval flow) depends on Task 5's denylist. Can mostly run in parallel; Task 7 should run after Task 5.

**Tech Stack:** Node.js ESM. No new deps except optional `dockerode` (only if Docker sandbox step is reached).

## Global Constraints
- Node >=18, ESM, no breaking CLI command renames.
- Critical fixes from `2026-06-29-critical-fixes.md` already merged — do not revert `auth/config.js`, `core/shell.js`, `plugins/system.js`, `auth/oauth.js`, `core/agents.js` encryption/mutex/CSRF changes.

---

### Task 5: Sandbox denylist + approval modes

**Files:**
- Modify: `core/executor.js`
- Modify: `core/commands.js` (add `/system` approval-mode setting)

**Interfaces:**
- Produces: `isRiskyCommand(cmd: string): boolean` exported from `core/executor.js`, used by Task 6 (plugin/approval flow) and Task 8 (DX approval UI).

- [ ] **Step 1:** Read `core/executor.js` to find `executeActions()` and where RUN_CMD/DELETE_FILE actions run.
- [ ] **Step 2:** Add and export:
```js
const DENYLIST_PATTERNS = [
  /\brm\s+-rf\b/i, /\bdel\s+\/s\b/i, /\bformat\b/i, /\bshutdown\b/i,
  /\bmkfs\b/i, /\b:(){ :|:& };:/, />\s*\/dev\/sd[a-z]/i,
];

export function isRiskyCommand(cmd) {
  return DENYLIST_PATTERNS.some((re) => re.test(cmd));
}
```
- [ ] **Step 3:** In `executeActions()`, before running a RUN_CMD or DELETE_FILE action, check `config.get('approvalMode', 'risky-only')`:
  - `'always'`: prompt for every RUN_CMD/DELETE_FILE.
  - `'risky-only'`: prompt only if `isRiskyCommand(action.command)` is true (or action type is `delete`).
  - `'never'`: never prompt (current autorun behavior).
  Use a simple `readline`-based y/n prompt (reuse pattern already in `core/commands.js` if one exists for confirmations; otherwise add a minimal `confirm(question)` helper using `readline/promises`).
- [ ] **Step 4:** Add `/system approval <always|risky-only|never>` subcommand in `core/commands.js` that calls `config.set('approvalMode', value)`.
- [ ] **Step 5:** Verify: `node -e "import('./core/executor.js').then(m=>console.log(m.isRiskyCommand('rm -rf /'), m.isRiskyCommand('npm install')))"` prints `true false`.
- [ ] **Step 6:** Commit:
```bash
git add core/executor.js core/commands.js
git commit -m "feat(security): add command denylist and approval modes"
```

---

### Task 6: Diff preview on WRITE_FILE approval

**Files:**
- Modify: `core/executor.js`
- Uses: `core/diff.js` (read its exports first, do not modify)

**Interfaces:**
- Consumes: existing exports from `core/diff.js` (read the file to find the diff-generation function name/signature before using it).
- Produces: when `approvalMode === 'always'`, WRITE_FILE actions print a diff and require y/n before writing.

- [ ] **Step 1:** Read `core/diff.js` fully to learn its exported function name and signature for generating a diff between old/new file content.
- [ ] **Step 2:** In `core/executor.js`'s WRITE_FILE handling, when `config.get('approvalMode') === 'always'`: read existing file content (empty string if file doesn't exist), call the diff function from `core/diff.js`, print the result, then call the same `confirm()` helper from Task 5 before writing. If declined, skip the write and record it as a skipped action in the report.
- [ ] **Step 3:** Verify: set approval mode to `always`, run a WRITE_FILE action in a scratch dir, confirm diff prints and declining (`n`) leaves the file untouched.
- [ ] **Step 4:** Commit:
```bash
git add core/executor.js
git commit -m "feat(dx): show diff preview before WRITE_FILE when approval mode is 'always'"
```

---

### Task 7: `/plugins` command + third-party plugin loading

**Files:**
- Modify: `core/commands.js`
- Modify: `plugins/index.js`

**Interfaces:**
- Produces: `loadUserPlugins(): Promise<Array<{name, commands, hooks}>>` exported from `plugins/index.js`, merged into the existing `plugins` export object at startup.

- [ ] **Step 1:** Read `plugins/index.js` fully to see the current `plugins` object shape (e.g. `plugins.tts`, `plugins.browser`, etc.) and how `nina.js` imports/uses it.
- [ ] **Step 2:** Add to `plugins/index.js`:
```js
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function loadUserPlugins() {
  const dir = path.join(os.homedir(), '.nina', 'plugins');
  if (!fs.existsSync(dir)) return [];
  const loaded = [];
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    try {
      const mod = await import(path.join(dir, file));
      if (mod.default?.name) loaded.push(mod.default);
    } catch (e) {
      console.error(`Failed to load plugin ${file}: ${e.message}`);
    }
  }
  return loaded;
}
```
- [ ] **Step 3:** In `core/commands.js`, add `/plugins` command: no args lists built-in + user plugin names with enabled/disabled status (track enabled state in `config.get('disabledPlugins', [])`); `/plugins disable <name>` / `/plugins enable <name>` toggle membership in that config array.
- [ ] **Step 4:** In `nina.js`, after importing `plugins` from `plugins/index.js`, call `loadUserPlugins()` once at startup and merge results into `state.plugins` (skip merging plugin commands into `getCommands()` to avoid scope creep — listing/enable/disable is the deliverable here; if a later task wants user-plugin commands wired into the command dispatcher, that's a separate task).
- [ ] **Step 5:** Verify: create `~/.nina/plugins/test-plugin.js` exporting `export default { name: 'test-plugin' }`, run `/plugins`, confirm it appears in the list.
- [ ] **Step 6:** Commit:
```bash
git add core/commands.js plugins/index.js nina.js
git commit -m "feat(dx): add /plugins command and third-party plugin loading"
```

---

### Task 8: Team mode shared blackboard

**Files:**
- Modify: `core/agents.js`

**Interfaces:**
- Consumes: existing worker loop and `nextTask`/`queueMutex` from the critical-fixes Task 4 (already merged).
- Produces: `blackboard` object `{ findings: Array<{role, action, result, ts}>, status: Record<string, string> }` exported from `core/agents.js`; `appendFinding(entry)` exported helper.

- [ ] **Step 1:** Read `core/agents.js` fully, focusing on the worker loop (where `nextTask(queue)` is awaited) and how results/output are currently surfaced (e.g. printed to console, returned to caller).
- [ ] **Step 2:** Add:
```js
import { Mutex } from 'async-mutex';
const blackboardMutex = new Mutex();
export const blackboard = { findings: [], status: {} };

export async function appendFinding(entry) {
  await blackboardMutex.runExclusive(() => {
    blackboard.findings.push({ ...entry, ts: Date.now() });
    blackboard.status[entry.role] = entry.action;
  });
}
```
- [ ] **Step 3:** In the worker loop, after each agent finishes a task (success or failure), call `await appendFinding({ role: agent.role, action: task.description, result: outcomeSummary })` — find the exact variable names for the agent's role and task description in the existing loop and use those, do not introduce parallel naming.
- [ ] **Step 4:** Where the live monitor renders agent status (search for the monitor-rendering code in `core/agents.js` or wherever team mode prints live updates), add a render of the last 5 `blackboard.findings` entries alongside existing per-agent status lines.
- [ ] **Step 5:** Verify: run `/team` on a simple multi-step goal with 3 agents, confirm console output shows blackboard entries from each role in order as they complete.
- [ ] **Step 6:** Commit:
```bash
git add core/agents.js
git commit -m "feat(team): add shared blackboard for inter-agent visibility"
```

---

### Task 9: Provider tool-calling schema (Anthropic/OpenAI/Gemini)

**Files:**
- Modify: `providers/index.js`
- Modify: `core/executor.js` (only to accept a pre-parsed action list, in addition to the existing text-parsing path)

**Interfaces:**
- Produces: `callProvider(...)` (existing signature, do not change call sites in `nina.js`) returns either a string (legacy text path, parsed by existing `parseActions()`) or, for tool-calling-capable providers, the existing return is unchanged but the function internally extracts `tool_calls` from the API response and converts them to the same action shape `parseActions()` already produces (`{type, path?, content?, command?}`), then serializes them back into the existing `WRITE_FILE:`/`RUN_CMD:`/`DELETE_FILE:` text format so `core/executor.js`'s `parseActions()` keeps working unmodified. This keeps the public interface stable while adding tool-calling under the hood.

- [ ] **Step 1:** Read `providers/index.js` fully to find the Anthropic, OpenAI, and Gemini call functions and their request-building code.
- [ ] **Step 2:** For Anthropic, add a `tools` array to the request body:
```js
const NINA_TOOLS = [
  { name: 'write_file', description: 'Write or overwrite a file', input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
  { name: 'run_cmd', description: 'Run a shell command', input_schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
  { name: 'delete_file', description: 'Delete a file', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
];
```
Pass `tools: NINA_TOOLS` in the Anthropic request body. Do the equivalent for OpenAI (`tools` with `type:'function'` wrapper) and Gemini (`tools: [{ functionDeclarations: [...] }]`), reusing the same 3 tool definitions translated to each provider's schema shape.
- [ ] **Step 3:** After receiving a response, if it contains tool calls (Anthropic: `content` blocks with `type:'tool_use'`; OpenAI: `choices[0].message.tool_calls`; Gemini: `candidates[0].content.parts` with `functionCall`), convert each to the text action format, e.g. for `write_file`: `` WRITE_FILE: ${path}\n```\n${content}\n``` ``, for `run_cmd`: `RUN_CMD: ${command}`, for `delete_file`: `DELETE_FILE: ${path}`. Join converted actions with newlines and return that string as if it were the model's text response (this is what flows into `parseActions()` in `nina.js` unchanged).
- [ ] **Step 4:** If a response has no tool calls (plain text), behavior is unchanged — return the text response as before.
- [ ] **Step 5:** Verify: mock a tool-call response shape per provider in a scratch script, confirm the conversion produces a string that `core/executor.js`'s `parseActions()` parses into the expected action objects.
- [ ] **Step 6:** Commit:
```bash
git add providers/index.js
git commit -m "feat(providers): add native tool-calling for Anthropic/OpenAI/Gemini"
```

---

### Task 10: Web-auth UX — auto-close + real Ollama model list

**Files:**
- Modify: `auth/web-auth.js`

**Interfaces:**
- No exported signature changes — `startWebAuth()` keeps its existing signature.

- [ ] **Step 1:** Read `auth/web-auth.js` fully (already reviewed; functions of interest: `setActive()` client-side JS around line 192, `onProviderChange()` around line 218, the Ollama card client JS `testOllama()` around line 183, and the server `/test-ollama` and `/close` routes).
- [ ] **Step 2:** In the client `setActive()` function, after a successful response (`data.ok`), call `fetch('/close')` and then `setTimeout(() => window.close(), 800)` (give the user time to see the "✓ Active" message before closing).
- [ ] **Step 3:** In `onProviderChange()`, when the selected provider is `'ollama'`, instead of using the static empty `PROVIDER_MODELS.ollama` list, call `fetch('/test-ollama')`, parse the comma-separated `data.models` string into an array, and populate `model-select` with those (fall back to the existing "no models found" empty state if `data.ok` is false or models is `'(none)'`).
- [ ] **Step 4:** Verify manually: start `nina`, run `/auth web`, select Ollama in the provider dropdown with Ollama running locally — confirm the model dropdown populates with real installed model names; click "Set Active" on any provider and confirm the page auto-closes after the success message.
- [ ] **Step 5:** Commit:
```bash
git add auth/web-auth.js
git commit -m "feat(auth): auto-close web-auth page on activate, list real Ollama models"
```
