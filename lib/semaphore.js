/**
 * Named semaphores -- per-upstream-source concurrency caps.
 *
 * Why this exists
 * ---------------
 * A composed "one address -> everything" tool fans out several calls in
 * parallel. If the MCP client issues a few of those in a row, you can
 * hammer an upstream API harder than it likes (especially Socrata, ArcGIS,
 * and the Census geocoder).
 *
 * Each named bucket here owns its own MAX_INFLIGHT and a FIFO wait queue.
 * Helpers wrap their fetch in `withLimit("source-key", fn)` and naturally
 * back off without retry stampedes.
 *
 * Override via env var if you have an app token or a private deal:
 *   LOCAL_DALLAS_LIMIT_SODA=8 LOCAL_DALLAS_LIMIT_ARCGIS=6 ...
 */

const DEFAULTS = {
  soda: 4,
  arcgis: 4,
  fema: 2,
  census: 2,
  nws: 4,
};

const BUCKETS = new Map();

function getBucket(key) {
  let b = BUCKETS.get(key);
  if (!b) {
    const envCap = Number(process.env[`LOCAL_DALLAS_LIMIT_${key.toUpperCase()}`]);
    const max = Number.isFinite(envCap) && envCap > 0 ? envCap : (DEFAULTS[key] ?? 4);
    b = { max, inflight: 0, queue: [] };
    BUCKETS.set(key, b);
  }
  return b;
}

function acquire(b) {
  if (b.inflight < b.max) {
    b.inflight++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    // Resolver pre-counts the slot, so release() needs no special case.
    b.queue.push(() => {
      b.inflight++;
      resolve();
    });
  });
}

function release(b) {
  b.inflight = Math.max(0, b.inflight - 1);
  const next = b.queue.shift();
  if (next) next();
}

/**
 * Run `fn` while holding a slot in the named bucket. Slot is always released
 * even if `fn` throws.
 */
export async function withLimit(key, fn) {
  const b = getBucket(key);
  await acquire(b);
  try {
    return await fn();
  } finally {
    release(b);
  }
}

export function getSnapshot() {
  const out = {};
  for (const [k, b] of BUCKETS) out[k] = { max: b.max, inflight: b.inflight, queued: b.queue.length };
  return out;
}
