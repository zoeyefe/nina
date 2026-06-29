import { execFileSync, exec } from 'child_process';
import { paint } from '../ui/colors.js';
import { getPowerShellExe } from '../core/shell.js';
import os from 'os';
import fs from 'fs';
import path from 'path';

// Safely embed a value as a PowerShell single-quoted string literal.
// Single-quoted strings in PowerShell have no escape sequences other than
// doubling an embedded single quote, so this cannot be used to break out
// into command execution (no $(), backtick, or `"` expansion applies).
function psSingleQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export const systemPlugin = {
  description: 'PC control: apps, clipboard, screenshot, notifications, processes',

  // System info
  info() {
    return {
      platform: process.platform,
      arch: os.arch(),
      hostname: os.hostname(),
      user: os.userInfo().username,
      ram: `${Math.round(os.freemem() / 1e6)}MB free / ${Math.round(os.totalmem() / 1e6)}MB total`,
      cpu: os.cpus()[0]?.model,
      uptime: `${Math.round(os.uptime() / 3600)}h`,
    };
  },

  // Open a file/URL/app
  open(target) {
    try {
      if (process.platform === 'win32') execFileSync('cmd.exe', ['/c', 'start', '""', target], { stdio: 'ignore' });
      else if (process.platform === 'darwin') execFileSync('open', [target], { stdio: 'ignore' });
      else execFileSync('xdg-open', [target], { stdio: 'ignore' });
      return true;
    } catch (e) { console.log(paint.error(e.message)); return false; }
  },

  // Clipboard
  clipboard: {
    read() {
      try {
        if (process.platform === 'win32') return execFileSync(getPowerShellExe(), ['-NoProfile', '-Command', 'Get-Clipboard'], { encoding: 'utf8' }).trim();
        if (process.platform === 'darwin') return execFileSync('pbpaste', [], { encoding: 'utf8' }).trim();
        return execFileSync('xclip', ['-selection', 'clipboard', '-o'], { encoding: 'utf8' }).trim();
      } catch { return ''; }
    },
    write(text) {
      try {
        if (process.platform === 'win32') {
          const script = `Set-Clipboard -Value ${psSingleQuote(text)}`;
          const encoded = Buffer.from(script, 'utf16le').toString('base64');
          execFileSync(getPowerShellExe(), ['-NoProfile', '-EncodedCommand', encoded], { stdio: 'ignore' });
        } else if (process.platform === 'darwin') {
          execFileSync('pbcopy', [], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
        } else {
          execFileSync('xclip', ['-selection', 'clipboard'], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
        }
        return true;
      } catch { return false; }
    },
  },

  // Screenshot
  screenshot(outPath = path.join(os.tmpdir(), `nina-ss-${Date.now()}.png`)) {
    try {
      if (process.platform === 'win32') {
        const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { $bmp = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); $bmp.Save(${psSingleQuote(outPath)}) }`;
        const encoded = Buffer.from(script, 'utf16le').toString('base64');
        execFileSync(getPowerShellExe(), ['-NoProfile', '-EncodedCommand', encoded], { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        execFileSync('screencapture', ['-x', outPath], { stdio: 'ignore' });
      } else {
        execFileSync('scrot', [outPath], { stdio: 'ignore' });
      }
      console.log(paint.success(`Screenshot: ${outPath}`));
      return outPath;
    } catch (e) { console.log(paint.error(e.message)); return null; }
  },

  // Desktop notification
  notify(title, body) {
    try {
      if (process.platform === 'win32') {
        const script = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null; $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode(${psSingleQuote(title)})); $xml.GetElementsByTagName('text')[1].AppendChild($xml.CreateTextNode(${psSingleQuote(body)})); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Nina').Show((New-Object Windows.UI.Notifications.ToastNotification $xml))`;
        const encoded = Buffer.from(script, 'utf16le').toString('base64');
        execFileSync(getPowerShellExe(), ['-NoProfile', '-EncodedCommand', encoded], { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        execFileSync('osascript', ['-e', `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`], { stdio: 'ignore' });
      } else {
        execFileSync('notify-send', [title, body], { stdio: 'ignore' });
      }
    } catch {}
  },

  // Process list
  processes(filter = '') {
    try {
      if (process.platform === 'win32') {
        const out = execFileSync('tasklist', ['/fo', 'csv', '/nh'], { encoding: 'utf8' });
        return out.split('\n')
          .filter(l => l && (!filter || l.toLowerCase().includes(filter.toLowerCase())))
          .slice(0, 20)
          .map(l => { const p = l.split('","'); return { name: p[0]?.replace(/"/g,''), pid: p[1], mem: p[4]?.replace(/"/g,'') }; });
      }
      const out = execFileSync('ps', ['aux'], { encoding: 'utf8' });
      const lines = out.split('\n').slice(1);
      const filtered = filter ? lines.filter(l => l.toLowerCase().includes(filter.toLowerCase())) : lines;
      return filtered.slice(0, 19);
    } catch { return []; }
  },

  // Kill process
  kill(pid) {
    try {
      if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(pid), '/F'], { stdio: 'pipe' });
      else execFileSync('kill', ['-9', String(pid)], { stdio: 'pipe' });
      return true;
    } catch { return false; }
  },

  // Read file (for AI context)
  readFile(filePath, maxBytes = 10000) {
    try {
      const buf = fs.readFileSync(filePath);
      return buf.slice(0, maxBytes).toString('utf8');
    } catch (e) { return `Error: ${e.message}`; }
  },

  // Watch file changes
  watch(filePath, callback) {
    return fs.watch(filePath, callback);
  },

  // Run background command, get output when done
  runAsync(cmd, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      exec(cmd, { cwd, encoding: 'utf8' }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    });
  },
};
