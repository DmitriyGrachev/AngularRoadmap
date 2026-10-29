import { InjectionToken, inject } from '@angular/core';
export const ISSUE_REPOSITORY = new InjectionToken('ISSUE_REPOSITORY');
export function createIssueReader() {
  const repository = inject(ISSUE_REPOSITORY);
  return { async listOpen() { return (await repository.list()).filter(item => item.status === 'OPEN'); } };
}
