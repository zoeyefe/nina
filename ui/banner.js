import { c, paint } from './colors.js';

export function showBanner(provider, model) {
  const modelShort = (model || '').replace('claude-','').replace('gpt-','').replace('-latest','');
  process.stdout.write(`
${c.cyan}${c.bold}  ░▒▓ NINA ▓▒░${c.reset}  ${c.dim}terminal ai agent · v1.0${c.reset}
  ${c.dim}────────────────────────────────${c.reset}
  ${c.dim}provider${c.reset}  ${c.magenta}${c.bold}${provider || '—'}${c.reset}${modelShort ? `  ${c.dim}${modelShort}${c.reset}` : ''}
  ${c.dim}────────────────────────────────${c.reset}
  ${c.dim}/ help   session   esc=stop${c.reset}

`);
}

export function getPrompt(provider, model, cwd) {
  const dir = cwd.split(/[/\\]/).pop() || cwd;
  const modelShort = (model || '').replace('claude-','').replace('gpt-','').replace('-latest','');
  return `${c.green}${c.bold}❯${c.reset} `;
}

export function printAIHeader(provider, model) {
  const modelShort = (model || '').replace('claude-','').replace('gpt-','').replace('-latest','');
  process.stdout.write(`\n${c.cyan}${c.bold}⬤${c.reset} ${c.bold}${provider}${c.reset}${modelShort ? ` ${c.dim}(${modelShort})${c.reset}` : ''}\n`);
}

export function printAIFooter() {
  process.stdout.write('\n');
}
