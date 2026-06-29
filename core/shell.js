import fs from 'fs';
import path from 'path';

function normalizeWindowsPowerShellCommand(command) {
  let c = String(command || '').trim();
  if (!c) return c;

  // PowerShell 5.1 doesn't support && / || operators
  c = c.replace(/\s*&&\s*/g, ' ; ');

  // Common Unix-style commands frequently produced by models
  c = c.replace(/^pwd$/i, 'Get-Location');
  c = c.replace(/^ls\s+-la$/i, 'Get-ChildItem -Force');
  c = c.replace(/^ls\s+-al$/i, 'Get-ChildItem -Force');
  c = c.replace(/^ls$/i, 'Get-ChildItem');

  // mkdir -p <path>  -> force-create directory on Windows
  c = c.replace(/^mkdir\s+-p\s+(.+)$/i, 'New-Item -ItemType Directory -Force -Path $1 | Out-Null');

  // rm -rf <path> -> Remove-Item -Recurse -Force <path>
  c = c.replace(/^rm\s+-rf\s+(.+)$/i, 'Remove-Item -Recurse -Force $1');

  return c;
}

function normalizeWindowsCmdCommand(command) {
  let c = String(command || '').trim();
  if (!c) return c;

  c = c.replace(/^pwd$/i, 'cd');
  c = c.replace(/^ls\s+-la$/i, 'dir /a');
  c = c.replace(/^ls\s+-al$/i, 'dir /a');
  c = c.replace(/^ls$/i, 'dir');
  c = c.replace(/^mkdir\s+-p\s+(.+)$/i, 'mkdir $1');
  c = c.replace(/^rm\s+-rf\s+(.+)$/i, 'rmdir /s /q $1');

  return c;
}

export function getPowerShellExe() {
  const root = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
  const psExe = path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  return fs.existsSync(psExe) ? psExe : 'powershell.exe';
}

export function buildExecCommand(command) {
  if (process.platform !== 'win32') return String(command || '');

  const psExe = getPowerShellExe();
  if (psExe) {
    const psCommand = normalizeWindowsPowerShellCommand(command);
    const encoded = Buffer.from(psCommand, 'utf16le').toString('base64');
    return `"${psExe}" -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`;
  }

  return normalizeWindowsCmdCommand(command);
}
