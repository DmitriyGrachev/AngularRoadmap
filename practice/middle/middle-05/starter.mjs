import { defer } from 'rxjs';
export function createReadCache(load) {
  return { read: key => defer(() => load(key)), invalidate: key => {} };
}

