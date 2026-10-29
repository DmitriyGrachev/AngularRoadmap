import { switchMap, map, catchError, startWith, of } from 'rxjs';
export function loadIssueState(ids$, load) {
  return ids$.pipe(switchMap(id => load(id).pipe(
    map(issue => ({ kind: 'ready', id, issue })),
    catchError(error => of({ kind: 'error', id, message: error instanceof Error ? error.message : 'Ошибка загрузки' })),
    startWith({ kind: 'loading', id })
  )));
}
