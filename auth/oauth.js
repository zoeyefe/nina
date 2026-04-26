import http from 'http';
import { config } from './config.js';
import { paint } from '../ui/colors.js';

const PORT = 9876;
const CALLBACK_URL = `http://localhost:${PORT}/callback`;

// Google OAuth — requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET env vars
export async function googleOAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars first.');
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');

  console.log(paint.info('\nOpen this URL in your browser:'));
  console.log(paint.dim(authUrl.toString()));

  const code = await waitForCallback();
  const tokens = await exchangeGoogleCode(code, clientId, clientSecret);
  config.set('google_token', tokens);
  console.log(paint.success('Google OAuth successful!'));
  return tokens;
}

// GitHub OAuth — requires GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET env vars
export async function githubOAuth() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET env vars first.');
  }

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  authUrl.searchParams.set('scope', 'read:user user:email');

  console.log(paint.info('\nOpen this URL in your browser:'));
  console.log(paint.dim(authUrl.toString()));

  const code = await waitForCallback();
  const tokens = await exchangeGithubCode(code, clientId, clientSecret);
  config.set('github_token', tokens);
  console.log(paint.success('GitHub OAuth successful!'));
  return tokens;
}

function waitForCallback() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (code) {
        res.end('<html><body><h2>Nina: Auth successful! You can close this tab.</h2></body></html>');
        server.close();
        resolve(code);
      } else {
        res.end(`<html><body><h2>Error: ${error}</h2></body></html>`);
        server.close();
        reject(new Error(error || 'OAuth failed'));
      }
    });

    server.listen(PORT, () => {
      console.log(paint.dim(`\nListening on localhost:${PORT} for OAuth callback...`));
    });

    server.on('error', reject);

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth timeout'));
    }, 5 * 60 * 1000);
  });
}

async function exchangeGoogleCode(code, clientId, clientSecret) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: CALLBACK_URL, grant_type: 'authorization_code' }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json();
}

async function exchangeGithubCode(code, clientId, clientSecret) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: CALLBACK_URL }),
  });
  if (!res.ok) throw new Error(`GitHub token exchange failed: ${await res.text()}`);
  return res.json();
}
