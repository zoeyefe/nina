import http from 'http';
import crypto from 'crypto';
import { config } from './config.js';
import { paint } from '../ui/colors.js';

const PORT = 9876;
const CALLBACK_URL = `http://localhost:${PORT}/callback`;

// Module-level state scoped to the in-flight OAuth attempt, used for CSRF protection.
let pendingState = null;

// Google OAuth — requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET env vars
export async function googleOAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars first.');
  }

  const state = crypto.randomBytes(16).toString('hex');
  pendingState = state;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('state', state);

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

  const state = crypto.randomBytes(16).toString('hex');
  pendingState = state;

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  authUrl.searchParams.set('scope', 'read:user user:email');
  authUrl.searchParams.set('state', state);

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
      const returnedState = url.searchParams.get('state') || '';

      const expectedState = pendingState || '';
      const expectedBuf = Buffer.from(expectedState);
      const returnedBuf = Buffer.from(returnedState);
      const stateValid =
        expectedState.length > 0 &&
        expectedBuf.length === returnedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, returnedBuf);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (code && stateValid) {
        res.end('<html><body><h2>Nina: Auth successful! You can close this tab.</h2></body></html>');
        server.close();
        pendingState = null;
        resolve(code);
      } else if (code && !stateValid) {
        res.end('<html><body><h2>Error: invalid OAuth state (possible CSRF attempt)</h2></body></html>');
        server.close();
        pendingState = null;
        reject(new Error('OAuth state mismatch — possible CSRF attempt'));
      } else {
        res.end(`<html><body><h2>Error: ${error}</h2></body></html>`);
        server.close();
        pendingState = null;
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
