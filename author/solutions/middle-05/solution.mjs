import { defer, finalize, ReplaySubject, share, tap } from 'rxjs';
export function createReadCache(load) {
  const entries = new Map();
  function entry(key) {
    if (entries.has(key)) return entries.get(key);
    let complete = false;
    const stream = defer(() => load(key)).pipe(
      tap({
        complete: () => { complete = true; },
        error: () => { if (entries.get(key) === stream) entries.delete(key); },
      }),
      finalize(() => { if (!complete && entries.get(key) === stream) entries.delete(key); }),
      share({ connector: () => new ReplaySubject(1), resetOnError: true, resetOnComplete: false, resetOnRefCountZero: true }),
    );
    entries.set(key, stream);
    return stream;
  }
  return {
    read: key => defer(() => entry(key)),
    invalidate: key => { entries.delete(key); },
  };
}

