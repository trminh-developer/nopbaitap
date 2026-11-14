// Download a pinned browser distribution; the website needs no package manager.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'vendor', 'axios');

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('Download failed: HTTP ' + response.status + ' at ' + url);
  return Buffer.from(await response.arrayBuffer());
}

(async () => {
  const metadata = JSON.parse((await download('https://registry.npmjs.org/axios/latest')).toString('utf8'));
  const version = metadata.version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected a stable Axios release');
  const source = 'https://cdn.jsdelivr.net/npm/axios@' + version;
  const assets = [
    ['dist/axios.min.js', 'axios.min.js'],
    ['dist/axios.min.js.map', 'axios.min.js.map'],
    ['LICENSE', 'LICENSE']
  ];
  const downloads = await Promise.all(assets.map(async ([remote, local]) => ({ local, bytes: await download(source + '/' + remote) })));
  const bundle = downloads.find(asset => asset.local === 'axios.min.js').bytes;
  if (!bundle.toString('utf8').includes('Axios v' + version)) throw new Error('Unexpected Axios distribution');
  fs.mkdirSync(directory, { recursive: true });
  for (const asset of downloads) fs.writeFileSync(path.join(directory, asset.local), asset.bytes);
  const integrity = 'sha384-' + crypto.createHash('sha384').update(bundle).digest('base64');
  fs.writeFileSync(path.join(directory, 'VERSION.txt'), 'Axios ' + version + '\nSource: ' + source + '\nIntegrity: ' + integrity + '\n');
  console.log(JSON.stringify({ version, directory, integrity, assets: downloads.map(asset => ({ file: asset.local, bytes: asset.bytes.length })) }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
