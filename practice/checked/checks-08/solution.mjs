import { InjectionToken, inject } from '@angular/core';
export const ISSUE_REPOSITORY = new InjectionToken('ISSUE_REPOSITORY');
export function createIssueReader() {
  const repository = inject(ISSUE_REPOSITORY);
  return { async listOpen() {
    // TODO: выберите OPEN, сохранив ошибки зависимости.
    return repository.list();
  } };
}
