import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleWeather } from './index.mjs';
const request = (dataset = 'F-D0047-065', method = 'GET') => new Request(`https://example.test/api/weather?dataset=${dataset}`, { method });
test('rejects arbitrary datasets before making upstream requests', async () => {
  const res = await handleWeather(request('https://evil.test'), { CWA_API_KEY: 'test-only-secret' }, () => { throw Error('must not fetch'); });
  assert.equal(res.status, 400);
});
test('requires configured server secret', async () => assert.equal((await handleWeather(request(), {})).status, 503));
test('does not permit writes', async () => assert.equal((await handleWeather(request(undefined, 'POST'), {})).status, 405));
test('uses a fixed CWA endpoint and keeps the key out of browser output', async () => {
  const res = await handleWeather(request(), { CWA_API_KEY: 'test-only-secret' }, async url => {
    assert.equal(url.origin, 'https://opendata.cwa.gov.tw');
    assert.equal(url.searchParams.get('Authorization'), 'test-only-secret');
    return Response.json({ success: 'true', records: { Locations: [] } });
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=300');
  assert.ok(!(await res.text()).includes('test-only-secret'));
});
test('masks upstream failures and exceptions', async () => {
  for (const fetcher of [async () => new Response('test-only-secret', { status: 401 }), async () => { throw Error('test-only-secret'); }, async () => Response.json({ success: 'false' })]) {
    const res = await handleWeather(request(), { CWA_API_KEY: 'test-only-secret' }, fetcher);
    assert.equal(res.status, 502);
    assert.ok(!(await res.text()).includes('test-only-secret'));
  }
});
test('serves static files and rejects unknown API paths', async () => {
  assert.equal((await worker.fetch(new Request('https://example.test/'), { ASSETS: { fetch: async () => new Response('page') } })).status, 200);
  assert.equal((await worker.fetch(new Request('https://example.test/api/unknown'), {})).status, 404);
});
