import { computed, signal } from '@angular/core';

export function createBoard(initial) {
  const issues = signal(initial);
  return {
    issues,
    openCount: computed(() => issues().filter(issue => issue.status === 'OPEN').length),
    add: issue => issues.update(items => [...items, issue]),
    setStatus: (id, status) => issues.update(items => items.map(issue => issue.id === id ? { ...issue, status } : issue)),
  };
}
