import { signal, computed } from '@angular/core';
export function createSelectionStore(initial) {
  const items = signal(initial), selectedId = signal(null);
  return { items, selectedId, selected: computed(() => items().find(row => row.id === selectedId()) ?? null),
    select: id => selectedId.set(id), replace: next => items.set(next),
    rename: (id, title) => items.update(rows => rows.map(row => row.id === id ? { ...row, title } : row)),
  };
}

