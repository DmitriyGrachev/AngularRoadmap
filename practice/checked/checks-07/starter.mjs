import { signal, computed } from '@angular/core';
export function createIssueStore(initial) {
  const issues = signal(initial), query = signal('');
  // TODO: вычислите фильтр и счётчик из signals.
  const visible = computed(() => issues()), openCount = computed(() => 0);
  function replaceStatus(id, status) {}
  return { issues, query, visible, openCount, replaceStatus };
}
