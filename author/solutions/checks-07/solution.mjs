import { signal, computed } from '@angular/core';
export function createIssueStore(initial) {
  const issues = signal(initial), query = signal('');
  const visible = computed(() => { const q = query().trim().toLowerCase(); return issues().filter(item => item.title.toLowerCase().includes(q)); });
  const openCount = computed(() => issues().filter(item => item.status === 'OPEN').length);
  function replaceStatus(id, status) { issues.update(items => items.map(item => item.id === id ? { ...item, status } : item)); }
  return { issues, query, visible, openCount, replaceStatus };
}
