/**
 * Teste de carga — simula 3.000 usuarios simultaneos usando o app.
 *
 * Fluxo por usuario virtual:
 *   1. POST /api/auth/login          (login)
 *   2. GET  /api/users/:id           (carregar perfil)
 *   3. GET  /api/users?view=ranking  (ranking)
 *   4. GET  /api/estandes            (listar estandes)
 *   5. GET  /api/users/:id/qrcode    (abrir QR Code do usuario)
 *   6. POST /api/users/:id/kit       (dar baixa em kit)
 *   7. POST /api/checkins            (escanear QR de um estande / quiz)
 *   8. POST /api/questions/sessions/attendance  (check-in de presenca)
 *
 * Uso:
 *   node scripts/load-test.js [BASE_URL] [TOTAL_USERS] [CONCURRENCY]
 *
 * Exemplos:
 *   node scripts/load-test.js http://localhost:3000 3000 200
 *   node scripts/load-test.js https://magalu-system.onrender.com 3000 150
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const TOTAL_USERS = Number(process.argv[3]) || 3000;
const CONCURRENCY = Number(process.argv[4]) || 200;

const isHttps = BASE_URL.startsWith('https');
const agent = isHttps
  ? new https.Agent({ keepAlive: true, maxSockets: CONCURRENCY, timeout: 30000 })
  : new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY, timeout: 30000 });

// ------- helpers -------

const stats = {
  total: 0,
  success: 0,
  clientError: 0,
  serverError: 0,
  networkError: 0,
  latencies: [],
};

const endpointStats = {};

function recordEndpoint(label, statusCode, durationMs) {
  if (!endpointStats[label]) {
    endpointStats[label] = { total: 0, ok: 0, '4xx': 0, '5xx': 0, err: 0, latencies: [] };
  }
  const ep = endpointStats[label];
  ep.total += 1;
  ep.latencies.push(durationMs);

  if (statusCode >= 200 && statusCode < 400) ep.ok += 1;
  else if (statusCode >= 400 && statusCode < 500) ep['4xx'] += 1;
  else if (statusCode >= 500) ep['5xx'] += 1;
  else ep.err += 1;
}

async function request(method, path, body, label) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    signal: AbortSignal.timeout(30000),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  stats.total += 1;
  const start = performance.now();
  let status = 0;

  try {
    const response = await fetch(url, options);
    status = response.status;
    const durationMs = Math.round(performance.now() - start);
    stats.latencies.push(durationMs);
    recordEndpoint(label, status, durationMs);

    const data = await response.json().catch(() => null);

    if (response.ok) {
      stats.success += 1;
    } else if (status >= 500) {
      stats.serverError += 1;
    } else {
      stats.clientError += 1;
    }

    return { ok: response.ok, status, data, durationMs };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    stats.latencies.push(durationMs);
    stats.networkError += 1;
    recordEndpoint(label, 0, durationMs);
    return { ok: false, status: 0, data: null, error: error.message, durationMs };
  }
}

// ------- user flow -------

async function simulateUser(userIndex) {
  const idMagalu = `loadtest_user_${String(userIndex).padStart(5, '0')}`;

  // 1. Login (vai falhar com 404 porque o usuario nao existe — simula carga de leitura no banco)
  const loginResult = await request('POST', '/api/auth/login', {
    id_magalu: idMagalu,
    senha: 'teste123',
  }, 'POST /auth/login');

  // Usa um userId fake mas valido para as proximas chamadas
  const fakeUserId = '000000000000000000000000';
  const userId = (loginResult.data && loginResult.data.user && loginResult.data.user._id) || fakeUserId;

  // 2. Carregar perfil
  await request('GET', `/api/users/${userId}`, null, 'GET /users/:id');

  // 3. Ranking (top 50)
  await request('GET', '/api/users?view=ranking&limit=50', null, 'GET /users?ranking');

  // 4. Listar estandes
  const estandesResult = await request('GET', '/api/estandes', null, 'GET /estandes');
  const estandes = (estandesResult.ok && Array.isArray(estandesResult.data)) ? estandesResult.data : [];
  const randomEstande = estandes.length > 0
    ? estandes[Math.floor(Math.random() * estandes.length)]
    : null;

  // 5. Abrir QR Code do usuario
  await request('GET', `/api/users/${userId}/qrcode`, null, 'GET /users/:id/qrcode');

  // 6. Dar baixa em kit
  await request('POST', `/api/users/${userId}/kit`, {}, 'POST /users/:id/kit');

  // 7. Escanear QR de estande (quiz checkin)
  if (randomEstande) {
    await request('POST', '/api/checkins', {
      userId,
      estandeId: randomEstande._id,
      pontos: Math.floor(Math.random() * 5) + 1,
      tempo: Math.floor(Math.random() * 60) + 10,
      origem: 'load-test',
    }, 'POST /checkins');
  }

  // 8. Check-in de presenca
  await request('POST', '/api/questions/sessions/attendance', {
    token: `loadtest_token_${userIndex}`,
    userId,
  }, 'POST /sessions/attendance');
}

// ------- runner -------

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, index)];
}

async function runBatch(startIndex, count) {
  const promises = [];
  for (let i = 0; i < count; i += 1) {
    promises.push(simulateUser(startIndex + i));
  }
  await Promise.allSettled(promises);
}

async function run() {
  console.log('========================================');
  console.log('  LOAD TEST — Magalu System');
  console.log('========================================');
  console.log(`  Base URL:     ${BASE_URL}`);
  console.log(`  Total users:  ${TOTAL_USERS}`);
  console.log(`  Concurrency:  ${CONCURRENCY}`);
  console.log(`  Requests/user: ~8`);
  console.log(`  Total requests: ~${TOTAL_USERS * 8}`);
  console.log('========================================\n');

  const startTime = performance.now();
  let completed = 0;

  for (let i = 0; i < TOTAL_USERS; i += CONCURRENCY) {
    const batchSize = Math.min(CONCURRENCY, TOTAL_USERS - i);
    await runBatch(i, batchSize);
    completed += batchSize;

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    const rps = (stats.total / (performance.now() - startTime) * 1000).toFixed(0);
    process.stdout.write(
      `\r  Progresso: ${completed}/${TOTAL_USERS} usuarios | ${stats.total} reqs | ${rps} req/s | ${elapsed}s`
    );
  }

  const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
  const sorted = stats.latencies.slice().sort((a, b) => a - b);

  console.log('\n\n========================================');
  console.log('  RESULTADOS');
  console.log('========================================');
  console.log(`  Tempo total:      ${totalTime}s`);
  console.log(`  Requests totais:  ${stats.total}`);
  console.log(`  Throughput:       ${(stats.total / totalTime).toFixed(0)} req/s`);
  console.log('');
  console.log(`  Sucesso (2xx/3xx): ${stats.success}`);
  console.log(`  Client error (4xx): ${stats.clientError}`);
  console.log(`  Server error (5xx): ${stats.serverError}`);
  console.log(`  Network error:     ${stats.networkError}`);
  console.log('');
  console.log('  Latencia (ms):');
  console.log(`    Min:  ${sorted[0] || 0}`);
  console.log(`    P50:  ${percentile(sorted, 50)}`);
  console.log(`    P90:  ${percentile(sorted, 90)}`);
  console.log(`    P95:  ${percentile(sorted, 95)}`);
  console.log(`    P99:  ${percentile(sorted, 99)}`);
  console.log(`    Max:  ${sorted[sorted.length - 1] || 0}`);

  console.log('\n  POR ENDPOINT:');
  console.log('  ' + '-'.repeat(100));
  console.log(
    '  ' +
    'Endpoint'.padEnd(32) +
    'Total'.padStart(7) +
    'OK'.padStart(7) +
    '4xx'.padStart(7) +
    '5xx'.padStart(7) +
    'Err'.padStart(7) +
    'P50ms'.padStart(8) +
    'P95ms'.padStart(8) +
    'P99ms'.padStart(8) +
    'Max ms'.padStart(8)
  );
  console.log('  ' + '-'.repeat(100));

  const labels = Object.keys(endpointStats).sort();
  for (const label of labels) {
    const ep = endpointStats[label];
    const s = ep.latencies.slice().sort((a, b) => a - b);
    console.log(
      '  ' +
      label.padEnd(32) +
      String(ep.total).padStart(7) +
      String(ep.ok).padStart(7) +
      String(ep['4xx']).padStart(7) +
      String(ep['5xx']).padStart(7) +
      String(ep.err).padStart(7) +
      String(percentile(s, 50)).padStart(8) +
      String(percentile(s, 95)).padStart(8) +
      String(percentile(s, 99)).padStart(8) +
      String(s[s.length - 1] || 0).padStart(8)
    );
  }

  console.log('  ' + '-'.repeat(100));
  console.log('========================================\n');

  // Alerta de problemas
  if (stats.serverError > 0) {
    console.log(`  ⚠ ATENCAO: ${stats.serverError} erros 5xx detectados!`);
  }
  if (stats.networkError > 0) {
    console.log(`  ⚠ ATENCAO: ${stats.networkError} erros de rede (timeouts/connection refused)!`);
  }

  const highLatencyEndpoints = labels.filter((label) => {
    const s = endpointStats[label].latencies.slice().sort((a, b) => a - b);
    return percentile(s, 95) > 2000;
  });
  if (highLatencyEndpoints.length > 0) {
    console.log(`  ⚠ Endpoints com P95 > 2s: ${highLatencyEndpoints.join(', ')}`);
  }

  if (stats.serverError === 0 && stats.networkError === 0) {
    console.log('  ✓ Nenhum erro de servidor ou rede detectado.');
  }

  console.log('');
}

run().catch((error) => {
  console.error('Erro fatal no load test:', error);
  process.exit(1);
});
