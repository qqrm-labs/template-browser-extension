import test from 'node:test';
import assert from 'node:assert/strict';
import { publishChrome } from './publish-chrome.mjs';

const env = Object.fromEntries(['CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN', 'EXTENSION_ID', 'PUBLISHER_ID'].map((key) => [`CWS_${key}`, 'test-value']));
const token = { access_token: 'secret-test-token' };
function mock(bodies) {
  const calls = [];
  return { calls, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.redirect, 'error');
    if (!bodies.length) throw new Error('unexpected network call');
    const body = bodies.shift();
    return body instanceof Response ? body : Response.json(body);
  }, sleep: async () => {} };
}
test('successful v2 upload followed by publish', async () => {
  const api = mock([token, { uploadState: 'SUCCEEDED' }, { state: 'PENDING_REVIEW' }]);
  assert.equal(await publishChrome(env, Buffer.from('zip'), api), 'PENDING_REVIEW');
  assert.match(api.calls[1].url, /\/upload\/v2\/publishers\/.+:upload$/);
  assert.deepEqual(JSON.parse(api.calls[2].options.body), { publishType: 'DEFAULT_PUBLISH', skipReview: false, blockOnWarnings: true });
});
test('pending upload is checked before publishing', async () => {
  const api = mock([token, { uploadState: 'IN_PROGRESS' }, { lastAsyncUploadState: 'SUCCEEDED' }, { state: 'PUBLISHED' }]);
  await publishChrome(env, Buffer.from('zip'), api);
  assert.match(api.calls[2].url, /:fetchStatus$/);
});
for (const body of [{}, { access_token: null }, { access_token: 'null' }, { error: 'invalid_grant' }, new Response('private-body', { status: 401 })]) {
  test(`invalid OAuth response stops before upload: ${JSON.stringify(body)}`, async () => {
    const api = mock([body]);
    await assert.rejects(publishChrome(env, Buffer.from('zip'), api), /OAuth:/);
    assert.equal(api.calls.length, 1);
  });
}
for (const body of [{ uploadState: 'FAILED' }, {}, { error: { message: 'secret' } }, new Response('secret', { status: 500 })]) {
  test('failed or malformed upload never publishes', async () => {
    const api = mock([token, body]);
    await assert.rejects(publishChrome(env, Buffer.from('zip'), api), (error) => !error.message.includes('secret'));
    assert.equal(api.calls.length, 2);
  });
}
test('pending upload polling is bounded', async () => {
  const api = mock([token, { uploadState: 'IN_PROGRESS' }, ...Array(12).fill({ lastAsyncUploadState: 'IN_PROGRESS' })]);
  await assert.rejects(publishChrome(env, Buffer.from('zip'), api), /Upload did not succeed/);
  assert.equal(api.calls.length, 14);
});
test('HTTP 200 with rejected publish is failure', async () => {
  const api = mock([token, { uploadState: 'SUCCEEDED' }, { state: 'REJECTED' }]);
  await assert.rejects(publishChrome(env, Buffer.from('zip'), api), /Publish did not/);
});
test('publisher configuration is required before network access', async () => {
  const api = mock([]);
  await assert.rejects(publishChrome({ ...env, CWS_PUBLISHER_ID: '' }, Buffer.from('zip'), api), /CWS_PUBLISHER_ID/);
  assert.equal(api.calls.length, 0);
});
