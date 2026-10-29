import { signal } from '@angular/core';
export function createOptimistic(initial) {
  let confirmed = { ...initial }, sequence = 0, active = null;
  const value = signal({ ...confirmed }), pending = signal(false);
  return {
    value: value.asReadonly(), pending: pending.asReadonly(),
    begin(title) {
      active = { requestId: ++sequence, expectedVersion: confirmed.version, title };
      value.set({ ...confirmed, title }); pending.set(true);
      return { ...active };
    },
    resolve(token, server) {
      if (!active || token.requestId !== active.requestId || server.id !== confirmed.id ||
          !Number.isSafeInteger(server.version) || server.version <= confirmed.version) return;
      confirmed = { ...server }; value.set({ ...confirmed }); active = null; pending.set(false);
    },
    reject(token) {
      if (!active || token.requestId !== active.requestId) return;
      value.set({ ...confirmed }); active = null; pending.set(false);
    },
  };
}

