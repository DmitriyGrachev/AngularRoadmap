import { signal } from '@angular/core';
export function createOptimistic(initial) {
  const value = signal(initial), pending = signal(false); let sequence = 0;
  return { value, pending,
    begin(title) { const token = { requestId: ++sequence, expectedVersion: value().version, title }; value.set({ ...value(), title }); pending.set(true); return token; },
    resolve(token, server) { value.set(server); pending.set(false); },
    reject(token) { value.set(initial); pending.set(false); },
  };
}

