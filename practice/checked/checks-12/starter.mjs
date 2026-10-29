import { switchMap, map } from 'rxjs';
export function loadIssueState(ids$, load) {
  // TODO: loading и обработка ошибки внутри каждого запроса.
  return ids$.pipe(switchMap(id => load(id).pipe(map(issue => ({ kind: 'ready', id, issue })))));
}
