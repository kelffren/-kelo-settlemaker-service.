import http from 'node:http';
import { generateSettlement } from './vendor/settlemaker/dist/settlemaker.browser.mjs';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_BODY_BYTES = 64 * 1024;

function allowedOrigins() {
  return String(process.env.KELO_ALLOWED_ORIGIN || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function corsOrigin(req) {
  const configured = allowedOrigins();
  if (!configured.length) return '*';
  const origin = String(req.headers.origin || '');
  if (configured.includes(origin)) return origin;
  if (/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(origin)) return origin;
  return configured[0];
}

function corsHeaders(req) {
  return {
    'access-control-allow-origin': corsOrigin(req),
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
    'vary': 'Origin'
  };
}

function json(req, res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    ...corsHeaders(req),
    'cache-control': 'no-store'
  });
  res.end(body);
}

function preflight(req, res) {
  res.writeHead(204, {
    ...corsHeaders(req),
    'content-length': '0',
    'cache-control': 'no-store'
  });
  res.end();
}

function normalizeRequest(input = {}) {
  const population = Math.max(10, Math.min(200000, Math.round(Number(input.population) || 5000)));
  const seed = Number.isFinite(Number(input.seed)) ? Math.trunc(Number(input.seed)) : 1;
  const port = Boolean(input.port);
  const harbourSize = port && input.harbourSize === 'large' ? 'large' : port ? 'small' : undefined;
  const roadBearings = Array.isArray(input.roadBearings)
    ? input.roadBearings.slice(0, 12).map(Number).filter(Number.isFinite).map(v => ((v % 360) + 360) % 360)
    : undefined;

  const burg = {
    name: String(input.name || `Kelo City ${seed}`).slice(0, 80),
    population,
    port,
    citadel: input.citadel !== false,
    walls: input.walls !== false,
    plaza: input.plaza !== false,
    temple: input.temple !== false,
    shanty: Boolean(input.shanty),
    capital: input.capital !== false,
    ...(typeof input.biome === 'string' && input.biome ? { biome: input.biome.slice(0, 40) } : {}),
    ...(typeof input.culture === 'string' && input.culture ? { culture: input.culture.slice(0, 80) } : {}),
    ...(roadBearings?.length ? { roadBearings } : {}),
    ...(Number.isFinite(Number(input.oceanBearing)) ? { oceanBearing: ((Number(input.oceanBearing) % 360) + 360) % 360 } : {}),
    ...(harbourSize ? { harbourSize } : {}),
    ...(Number.isFinite(Number(input.urbanDensity)) ? { urbanDensity: Math.max(1, Math.min(12, Number(input.urbanDensity))) } : {}),
    ...(Number.isFinite(Number(input.coreCapacity)) ? { coreCapacity: Math.max(1000, Math.min(100000, Math.round(Number(input.coreCapacity)))) } : {}),
    ...(input.trade === true ? { trade: true } : {})
  };

  return { seed, burg };
}

function deterministicGeoJson(geojson) {
  if (!geojson || typeof geojson !== 'object') return geojson;
  const metadata = geojson.metadata;
  if (!metadata || typeof metadata !== 'object' || !Object.prototype.hasOwnProperty.call(metadata, 'generated_at')) {
    return geojson;
  }

  const { generated_at: _generatedAt, ...stableMetadata } = metadata;
  return { ...geojson, metadata: stableMetadata };
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('REQUEST_TOO_LARGE'), { statusCode: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('INVALID_JSON'), { statusCode: 400 });
  }
}

export function generateForKelo(input = {}) {
  const { seed, burg } = normalizeRequest(input);
  const result = generateSettlement(burg, { seed });
  return {
    service: 'kelo-settlemaker-service',
    schemaVersion: 1,
    generator: 'settlemaker',
    kind: result.kind,
    seed,
    request: burg,
    degradedFlags: result.degradedFlags || [],
    originShift: result.originShift || null,
    geojson: deterministicGeoJson(result.geojson)
  };
}

export function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return preflight(req, res);

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json(req, res, 200, {
        ok: true,
        service: 'kelo-settlemaker-service',
        version: '0.1.1',
        generator: 'settlemaker@2.3.0'
      });
    }

    if (req.method === 'POST' && url.pathname === '/generate') {
      try {
        const input = await readJson(req);
        const generated = generateForKelo(input);
        return json(req, res, 200, generated);
      } catch (error) {
        console.error('[kelo-settlemaker-service]', error);
        return json(req, res, error?.statusCode || 500, {
          ok: false,
          error: error?.message || 'GENERATION_FAILED'
        });
      }
    }

    return json(req, res, 404, { ok: false, error: 'NOT_FOUND' });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(PORT, HOST, () => {
    console.log(`[kelo-settlemaker-service] listening on http://${HOST}:${PORT}`);
  });
}
