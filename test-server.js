import http from 'http';
import { spawn } from 'child_process';

const TEST_PORT = 10005;

function fetchUrl(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: path,
        method: 'GET',
        headers: headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('[TestServer] Spawning server.js on port ' + TEST_PORT + '...');
  const proc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: 'pipe'
  });

  proc.stdout.on('data', (d) => process.stdout.write('[ServerOut] ' + d));
  proc.stderr.on('data', (d) => process.stderr.write('[ServerErr] ' + d));

  // Wait 1 second for server to initialize
  await new Promise((r) => setTimeout(r, 1000));

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log('  ✓ PASS: ' + msg);
      passed++;
    } else {
      console.error('  ✗ FAIL: ' + msg);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('\n--- 1. Testing /healthz ---');
    const healthRes = await fetchUrl('/healthz');
    assert(healthRes.status === 200, 'Status is 200 OK');
    const healthJson = JSON.parse(healthRes.body);
    assert(healthJson.status === 'ok', 'Body status is ok');
    assert(healthJson.service === 'madhuris-choco-heaven', 'Service name is correct');

    // 2. Root index.html
    console.log('\n--- 2. Testing / ---');
    const rootRes = await fetchUrl('/');
    assert(rootRes.status === 200, 'Status is 200 OK');
    assert(rootRes.headers['content-type'].includes('text/html'), 'Content-Type is text/html');
    assert(rootRes.body.includes('Madhuri\'s Choco Heaven'), 'HTML contains brand title');
    assert(rootRes.headers['x-content-type-options'] === 'nosniff', 'Security header nosniff is set');
    assert(rootRes.headers['cache-control'].includes('no-cache'), 'Cache-Control is no-cache for index.html');

    // 3. SPA Routing fallback for unknown/nested routes
    console.log('\n--- 3. Testing SPA Routing Fallback (/login, /cart, /admin) ---');
    const loginRes = await fetchUrl('/login');
    assert(loginRes.status === 200, '/login returns 200 via SPA fallback');
    assert(loginRes.body.includes('<div id="root"></div>'), '/login returns index.html');

    const adminRes = await fetchUrl('/admin');
    assert(adminRes.status === 200, '/admin returns 200 via SPA fallback');

    // 4. Gzip compression check
    console.log('\n--- 4. Testing Gzip Compression ---');
    const gzipRes = await fetchUrl('/', { 'Accept-Encoding': 'gzip' });
    assert(gzipRes.status === 200, 'Gzip request returns 200 OK');
    assert(gzipRes.headers['content-encoding'] === 'gzip', 'Content-Encoding is gzip');

    console.log(`\n========================================`);
    console.log(`SERVER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);
  } finally {
    console.log('[TestServer] Stopping server process (SIGTERM)...');
    proc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
