import test from 'node:test';
import assert from 'node:assert/strict';
import { generateForKelo } from '../server.mjs';

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
