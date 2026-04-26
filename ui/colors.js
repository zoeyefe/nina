// ANSI terminal color/style utilities
export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

export const paint = {
  success: (s) => `${c.green}${s}${c.reset}`,
  error: (s) => `${c.red}${s}${c.reset}`,
  warn: (s) => `${c.yellow}${s}${c.reset}`,
  info: (s) => `${c.cyan}${s}${c.reset}`,
  dim: (s) => `${c.dim}${s}${c.reset}`,
  bold: (s) => `${c.bold}${s}${c.reset}`,
  provider: (s) => `${c.magenta}${c.bold}${s}${c.reset}`,
  file: (s) => `${c.cyan}${s}${c.reset}`,
  cmd: (s) => `${c.yellow}${s}${c.reset}`,
  user: (s) => `${c.blue}${c.bold}${s}${c.reset}`,
  ai: (s) => `${c.green}${c.bold}${s}${c.reset}`,
  added: (s) => `${c.green}+ ${s}${c.reset}`,
  removed: (s) => `${c.red}- ${s}${c.reset}`,
  context: (s) => `${c.gray}  ${s}${c.reset}`,
};

export function hr(char = '─', width = 60) {
  return c.dim + char.repeat(width) + c.reset;
}

export function box(title, content, color = c.cyan) {
  const lines = content.split('\n');
  const maxLen = Math.max(title.length, ...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length));
  const w = Math.min(maxLen + 4, 80);
  const top = color + '┌' + '─'.repeat(w - 2) + '┐' + c.reset;
  const bot = color + '└' + '─'.repeat(w - 2) + '┘' + c.reset;
  const pad = (s) => {
    const raw = s.replace(/\x1b\[[0-9;]*m/g, '');
    return color + '│ ' + c.reset + s + ' '.repeat(Math.max(0, w - 3 - raw.length)) + color + '│' + c.reset;
  };
  const titleLine = color + '│ ' + c.bold + title + c.reset + ' '.repeat(Math.max(0, w - 3 - title.length)) + color + '│' + c.reset;
  const sep = color + '├' + '─'.repeat(w - 2) + '┤' + c.reset;
  return [top, titleLine, sep, ...lines.map(pad), bot].join('\n');
}
