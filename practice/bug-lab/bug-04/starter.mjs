import { computed, signal } from '@angular/core';

export function createBoard(initial) {
  const issues = signal(initial);
  return {
    issues,
    openCount: computed(() => issues().filter(issue => issue.status === 'OPEN').length),
    add(issue) {
      issues().push(issue);
      issues.set(issues());
    },
    setStatus(id, status) {
      const issue = issues().find(issue => issue.id === id);
      if (issue) issue.status = status;
      issues.set(issues());
    },
  };
}
