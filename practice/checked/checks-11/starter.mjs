import { map, mergeMap } from 'rxjs';
export function searchIssues(queries$, search) {
  // TODO: нормализация, пауза, исключение повторов и отмена.
  return queries$.pipe(mergeMap(query => search(query).pipe(map(items => ({ kind: 'ready', query, items })))));
}
