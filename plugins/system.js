import { execSync, exec } from 'child_process';
import { paint } from '../ui/colors.js';
import os from 'os';
import fs from 'fs';
import path from 'path';

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
      if (process.platform === 'win32') execSync(`start "" "${target}"`, { stdio: 'ignore' });
      else if (process.platform === 'darwin') execSync(`open "${target}"`, { stdio: 'ignore' });
      else execSync(`xdg-open "${target}"`, { stdio: 'ignore' });
      return true;
    } catch (e) { console.log(paint.error(e.message)); return false; }
  },

  // Clipboard
  clipboard: {
    read() {
      try {
        if (process.platform === 'win32') return execSync('powershell -command "Get-Clipboard"', { encoding: 'utf8' }).trim();
        if (process.platform === 'darwin') return execSync('pbpaste', { encoding: 'utf8' }).trim();
        return execSync('xclip -selection clipboard -o', { encoding: 'utf8' }).trim();
      } catch { return ''; }
    },
    write(text) {
      try {
        if (process.platform === 'win32') execSync(`powershell -command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`, { stdio: 'ignore' });
        else if (process.platform === 'darwin') execSync(`echo '${text}' | pbcopy`, { stdio: 'ignore' });
        else execSync(`echo '${text}' | xclip -selection clipboard`, { stdio: 'ignore' });
        return true;
      } catch { return false; }
    },
  },

  // Screenshot
  screenshot(outPath = path.join(os.tmpdir(), `nina-ss-${Date.now()}.png`)) {
    try {
      if (process.platform === 'win32') {
        execSync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { $bmp = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); $bmp.Save('${outPath}') }"`, { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        execSync(`screencapture -x "${outPath}"`, { stdio: 'ignore' });
      } else {
        execSync(`scrot "${outPath}"`, { stdio: 'ignore' });
      }
      console.log(paint.success(`Screenshot: ${outPath}`));
      return outPath;
    } catch (e) { console.log(paint.error(e.message)); return null; }
  },

  // Desktop notification
  notify(title, body) {
    try {
      if (process.platform === 'win32') {
        execSync(`powershell -command "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null; $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${title}')); $xml.GetElementsByTagName('text')[1].AppendChild($xml.CreateTextNode('${body}')); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Nina').Show((New-Object Windows.UI.Notifications.ToastNotification $xml))"`, { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        execSync(`osascript -e 'display notification "${body}" with title "${title}"'`, { stdio: 'ignore' });
      } else {
        execSync(`notify-send "${title}" "${body}"`, { stdio: 'ignore' });
      }
    } catch {}
  },

  // Process list
  processes(filter = '') {
    try {
      if (process.platform === 'win32') {
        const out = execSync('tasklist /fo csv /nh', { encoding: 'utf8' });
        return out.split('\n')
          .filter(l => l && (!filter || l.toLowerCase().includes(filter.toLowerCase())))
          .slice(0, 20)
          .map(l => { const p = l.split('","'); return { name: p[0]?.replace(/"/g,''), pid: p[1], mem: p[4]?.replace(/"/g,'') }; });
      }
      const out = execSync(`ps aux${filter ? ` | grep ${filter}` : ''}`, { encoding: 'utf8' });
      return out.split('\n').slice(1, 20);
    } catch { return []; }
  },

  // Kill process
  kill(pid) {
    try {
      if (process.platform === 'win32') execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
      else execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
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
