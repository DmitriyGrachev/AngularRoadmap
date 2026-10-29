import { signal, computed } from '@angular/core';
export function createSelectionStore(initial) {
  const items = signal(initial), selectedId = signal(null);
  const selected = computed(() => items().find(row => row.id === selectedId()) ?? null);
  return {
    items: items.asReadonly(), selectedId: selectedId.asReadonly(), selected,
    select(id) { if (id === null || items().some(row => row.id === id)) selectedId.set(id); },
    replace(next) {
      items.set(next);
      if (!next.some(row => row.id === selectedId())) selectedId.set(null);
    },
    rename(id, title) {
      if (!items().some(row => row.id === id && row.title !== title)) return;
      items.update(rows => rows.map(row => row.id === id ? { ...row, title } : row));
    },
  };
}

