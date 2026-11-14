// Read-only deployment check: GET and an invalid POST with no file data.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const axios = require(path.join(root, 'vendor/axios/axios.min.js'));
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const match = app.match(/\bconst\s+API_URL\s*=\s*(['"])([^'"]+)\1/);
if (!match) throw new Error('Cannot find API_URL in app.js');
const apiUrl = match[2];
const origin = process.argv[2] || 'http://127.0.0.1:5173';
const expectedProtocol = fs.readFileSync(path.join(root, 'upload-core.js'), 'utf8').match(/\bPROTOCOL\s*=\s*['"]([^'"]+)/)[1];

async function probe(method) {
  let url = apiUrl;
  let currentMethod = method;
  const hops = [];
  for (let index = 0; index < 6; index++) {
    let response;
    try {
      response = await axios.request({
        url,
        method: currentMethod,
        headers: { Origin: origin, ...(currentMethod === 'POST' ? { 'Content-Type': 'text/plain;charset=utf-8' } : {}) },
        ...(currentMethod === 'POST' ? { data: JSON.stringify({ action: 'diagnostics', files: [] }) } : {}),
        adapter: 'fetch', fetchOptions: { redirect: 'manual' },
        responseType: 'text', transformRequest: [value => value], transformResponse: [value => value],
        validateStatus: () => true, timeout: 20000, withCredentials: false
      });
    } catch (error) {
      return { method, hops, error: error.cause?.code || error.message };
    }
    const location = response.headers.get('location');
    const requestUrl = new URL(url);
    const hop = {
      url: requestUrl.origin + requestUrl.pathname,
      status: response.status,
      contentType: response.headers.get('content-type'),
      allowOrigin: response.headers.get('access-control-allow-origin')
    };
    hops.push(hop);
    if (location && [301, 302, 303, 307, 308].includes(response.status)) {
      url = new URL(location, url).href;
      if (response.status === 303 || ([301, 302].includes(response.status) && currentMethod === 'POST')) currentMethod = 'GET';
      continue;
    }
    const body = response.data;
    let json;
    try { json = JSON.parse(body); } catch (_) {}
    return {
      method, hops,
      finalStatus: response.status,
      finalResponseAllowsOrigin: hop.allowOrigin === '*' || hop.allowOrigin === origin,
      ...(json ? {
        json: {
          success: json.success, protocol: json.protocol, stage: json.stage, service: json.service, status: json.status,
          message: typeof json.message === 'string' ? json.message.slice(0, 400) : undefined,
          filesCount: Array.isArray(json.files) ? json.files.length : undefined
        }
      } : {
        htmlTitle: body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim(),
        bodySnippet: body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
      })
    };
  }
  return { method, hops, error: 'Too many redirects' };
}

(async () => {
  const [get, post] = await Promise.all([probe('GET'), probe('POST')]);
  console.log(JSON.stringify({ client: 'axios', clientVersion: axios.VERSION, apiUrl, origin, expectedProtocol, get, post }, null, 2));
  if (post.json?.protocol !== expectedProtocol || post.json?.success !== false) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
