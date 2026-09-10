import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, generateForKelo } from '../server.mjs';

test('same seed produces the same GeoJSON', () => {
  const input = {
    name: 'Kelo Test City',
    seed: 12345,
    population: 12000,
    walls: true,
    plaza: true,
    citadel: true,
    temple: true,
    capital: true,
    port: false,
    roadBearings: [0, 90, 180, 270]
  };

  const a = generateForKelo(input);
  const b = generateForKelo(input);

  assert.equal(a.generator, 'settlemaker');
  assert.equal(a.seed, 12345);
  assert.equal(a.kind, 'settlement');
  assert.equal(a.geojson.type, 'FeatureCollection');
  assert.ok(Array.isArray(a.geojson.features));
  assert.ok(a.geojson.features.length > 10);
  assert.deepEqual(a.geojson, b.geojson);
});

test('service normalizes unsafe or missing inputs', () => {
  const result = generateForKelo({ seed: 7, population: -1 });
  assert.equal(result.request.population, 10);
  assert.equal(result.request.port, false);
  assert.equal(result.request.walls, true);
  assert.equal(result.geojson.type, 'FeatureCollection');
});

test('OPTIONS preflight is bodyless and allows Kelo local browser origin', async t => {
  const previous = process.env.KELO_ALLOWED_ORIGIN;
  process.env.KELO_ALLOWED_ORIGIN = 'https://kelffren.github.io';
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.KELO_ALLOWED_ORIGIN;
    else process.env.KELO_ALLOWED_ORIGIN = previous;
  });

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/generate`, {
    method: 'OPTIONS',
    headers: {
      origin: 'http://127.0.0.1:4173',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type'
    }
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:4173');
  assert.match(response.headers.get('access-control-allow-methods') || '', /POST/);
  assert.match(response.headers.get('access-control-allow-headers') || '', /content-type/i);
  assert.equal(response.headers.get('content-length'), '0');
  assert.equal(await response.text(), '');
});
