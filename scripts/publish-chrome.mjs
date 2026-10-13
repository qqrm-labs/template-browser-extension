import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Never include response bodies or credentials in errors printed by the release job.
async function request(fetchImpl, stage, url, options) {
  let response;
  try {
    response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(120_000) });
  } catch {
    throw new Error(`${stage}: request failed`);
  }
  if (!response.ok) throw new Error(`${stage}: HTTP ${response.status}`);
  let body;
  try { body = await response.json(); } catch { throw new Error(`${stage}: invalid JSON`); }
  if (!body || typeof body !== 'object' || body.error) throw new Error(`${stage}: API error`);
  return body;
}

export async function publishChrome(env, archive, {
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  for (const name of ['CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN', 'CWS_EXTENSION_ID', 'CWS_PUBLISHER_ID']) {
    if (typeof env[name] !== 'string' || !env[name].trim()) throw new Error(`Missing ${name}`);
  }
  const name = `publishers/${encodeURIComponent(env.CWS_PUBLISHER_ID)}/items/${encodeURIComponent(env.CWS_EXTENSION_ID)}`;
  const token = await request(fetchImpl, 'OAuth', 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: env.CWS_CLIENT_ID, client_secret: env.CWS_CLIENT_SECRET,
      refresh_token: env.CWS_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  if (typeof token.access_token !== 'string' || !token.access_token.trim() || token.access_token === 'null') {
    throw new Error('OAuth: missing access token');
  }
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const base = 'https://chromewebstore.googleapis.com';
  const upload = await request(fetchImpl, 'Upload', `${base}/upload/v2/${name}:upload`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/zip' }, body: archive,
  });
  let state = upload.uploadState;
  for (let attempt = 0; state === 'IN_PROGRESS' && attempt < 12; attempt++) {
    await sleep(5_000);
    const status = await request(fetchImpl, 'Upload status', `${base}/v2/${name}:fetchStatus`, { headers });
    state = status.lastAsyncUploadState;
  }
  if (state !== 'SUCCEEDED') throw new Error('Upload did not succeed; publishing was stopped');
  const result = await request(fetchImpl, 'Publish', `${base}/v2/${name}:publish`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH', skipReview: false, blockOnWarnings: true }),
  });
  if (!['PENDING_REVIEW', 'PUBLISHED'].includes(result.state)) throw new Error('Publish did not reach an accepted state');
  return result.state;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const archive = await readFile('dist/chrome/extension.zip');
    console.log(`Chrome Web Store: ${await publishChrome(process.env, archive)}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
