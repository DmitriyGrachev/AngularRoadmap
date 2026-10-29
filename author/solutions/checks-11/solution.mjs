import { map, debounceTime, distinctUntilChanged, switchMap, startWith, of } from 'rxjs';
export function searchIssues(queries$, search) {
  return queries$.pipe(
    map(query => query.trim()), debounceTime(30), distinctUntilChanged(),
    switchMap(query => query ? search(query).pipe(map(items => ({ kind: 'ready', query, items })), startWith({ kind: 'loading', query })) : of({ kind: 'ready', query: '', items: [] }))
  );
}
