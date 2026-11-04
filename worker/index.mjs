const datasets = new Set(['001','005','009','013','017','021','025','029','033','037','041','045','049','053','057','061','065','069','073','077','081','085'].map(id => `F-D0047-${id}`));
const jsonError = (message, status) => Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function handleWeather(request, env, fetchUpstream = fetch) {
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  const dataset = new URL(request.url).searchParams.get('dataset');
  if (!datasets.has(dataset)) return jsonError('不支援的縣市資料集', 400);
  if (!env.CWA_API_KEY) return jsonError('天氣服務尚未設定完成', 503);
  const upstream = new URL(`https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataset}`);
  upstream.searchParams.set('Authorization', env.CWA_API_KEY);
  upstream.searchParams.set('format', 'JSON');
  try {
    const response = await fetchUpstream(upstream, { signal: AbortSignal.timeout(10000), cf: { cacheTtl: 300, cacheEverything: true } });
    if (!response.ok) return jsonError('氣象資料暫時無法讀取', 502);
    const data = await response.json();
    if (!data.records || (data.success !== undefined && String(data.success) !== 'true')) return jsonError('氣象資料格式異常', 502);
    return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return jsonError('氣象服務連線逾時或暫時無法使用', 502);
  }
}

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/weather') return handleWeather(request, env);
    if (pathname.startsWith('/api/')) return jsonError('找不到此服務', 404);
    return env.ASSETS.fetch(request);
  }
};
