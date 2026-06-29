# Nina 2.0 Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 4 release-gate security/reliability bugs found in the Nina 2.0 code scan before any new feature work lands.

**Architecture:** Each fix is isolated to its own file/module; no cross-task dependencies. Order doesn't matter — can run in parallel.

**Tech Stack:** Node.js ESM, no new deps except `keytar` (optional, with graceful fallback) and `async-mutex`.

## Global Constraints
- Node >=18, ESM (`type:module`), no breaking changes to public CLI commands.
- Existing `~/.nina/credentials.json` must migrate without data loss.

---

### Task 1: Real credential encryption

**Files:**
- Modify: `auth/config.js`
- Test: manual — `node -e` round-trip script (no test framework in repo)

**Interfaces:**
- Produces: `config.setKey(provider, key)` / `config.getKey(provider)` keep same signatures, internal storage format changes from base64 to encrypted JSON `{iv, tag, data}`.

- [ ] **Step 1:** Read current `auth/config.js` to find the base64 `setKey`/`getKey` implementation (around line 32).
- [ ] **Step 2:** Add AES-256-GCM helpers:
```js
import crypto from 'crypto';
import os from 'os';

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
```
- [ ] **Step 3:** Replace base64 encode/decode calls in `setKey`/`getKey` with `encrypt`/`decrypt`.
- [ ] **Step 4:** Add one-time migration on load: if a stored value is a plain string (old base64 format, no `{iv,tag,data}` shape), decode base64, re-encrypt, rewrite file.
- [ ] **Step 5:** Verify: `node -e "import('./auth/config.js').then(async m=>{m.config.setKey('test','abc123'); console.log(m.config.getKey('test'))})"` prints `abc123`.
- [ ] **Step 6:** Commit:
```bash
git add auth/config.js
git commit -m "fix(auth): replace base64 credential storage with AES-256-GCM"
```

---

### Task 2: Fix shell injection in exec calls

**Files:**
- Modify: `core/shell.js`
- Modify: `plugins/system.js`

**Interfaces:**
- Produces: any function that ran a shell command via string interpolation now takes structured args and calls `execFile`/`spawn` with an argv array — callers outside these two files are unaffected (same exported function names/signatures).

- [ ] **Step 1:** Read `core/shell.js` and `plugins/system.js` in full to enumerate every `exec(`/`execSync(` call using string concatenation/template literals.
- [ ] **Step 2:** For each, replace with `execFile`/`spawnSync` using an argv array, e.g.:
```js
import { execFileSync } from 'child_process';
// before: exec(`some-cmd "${arg}"`)
// after:
execFileSync('some-cmd', [arg], { encoding: 'utf8' });
```
- [ ] **Step 3:** For PowerShell-specific calls (`core/shell.js`), pass the script via `-EncodedCommand` built from a Buffer, not string concatenation, and pass user content as a separate argv element, never inlined into the encoded script.
- [ ] **Step 4:** Manually verify: run each affected command path (clipboard write/read, notify, open) with an argument containing `` ` ``, `$()`, `;` and confirm no command execution occurs (the characters are treated as literal text).
- [ ] **Step 5:** Commit:
```bash
git add core/shell.js plugins/system.js
git commit -m "fix(security): eliminate shell injection in exec calls"
```

---

### Task 3: OAuth CSRF state validation

**Files:**
- Modify: `auth/oauth.js`

**Interfaces:**
- Produces: `googleOAuth()` / `githubOAuth()` keep same exported signatures; internally generate+check `state`.

- [ ] **Step 1:** Read `auth/oauth.js` around lines 58 and 75 to find where the OAuth redirect URL is built and where the callback is handled.
- [ ] **Step 2:** Generate a random state before redirect:
```js
import crypto from 'crypto';
const state = crypto.randomBytes(16).toString('hex');
```
Store it in a module-level variable scoped to that OAuth attempt, include it in the authorize URL as `&state=${state}`.
- [ ] **Step 3:** In the callback handler, read `state` from the incoming query string and compare to the stored value with `crypto.timingSafeEqual` (convert both to same-length buffers); if mismatch, reject with an error and do not exchange the code.
- [ ] **Step 4:** Verify: manually call the callback handler with a wrong `state` value and confirm it returns an error instead of proceeding.
- [ ] **Step 5:** Commit:
```bash
git add auth/oauth.js
git commit -m "fix(security): validate OAuth state to prevent CSRF"
```

---

### Task 4: Fix worker queue race condition

**Files:**
- Modify: `core/agents.js`
- Add dependency: `async-mutex` (`npm install async-mutex`)

**Interfaces:**
- Produces: queue consumption is serialized; exported agent-runner function signatures unchanged.

- [ ] **Step 1:** Run `npm install async-mutex` and confirm it's added to `package.json` dependencies.
- [ ] **Step 2:** Read `core/agents.js` around line 345 to find the worker pool's `queue.shift()` usage.
- [ ] **Step 3:** Wrap queue access in a mutex:
```js
import { Mutex } from 'async-mutex';
const queueMutex = new Mutex();

async function nextTask(queue) {
  return queueMutex.runExclusive(() => queue.shift());
}
```
Replace direct `queue.shift()` calls in the worker loop with `await nextTask(queue)`.
- [ ] **Step 4:** Verify: run team mode with 3+ parallel workers on a task list of 10+ items, confirm in logs that no task id is processed twice or skipped (add a temporary `console.log` of consumed task ids, remove after verifying).
- [ ] **Step 5:** Commit:
```bash
git add core/agents.js package.json package-lock.json
git commit -m "fix(agents): serialize worker queue access to fix race condition"
```
