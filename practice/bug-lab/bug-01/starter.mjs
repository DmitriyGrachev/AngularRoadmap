import { catchError, map, of, switchMap } from 'rxjs';

export function search(queries$, request) {
  return queries$.pipe(
    switchMap(query => request(query).pipe(map(items => ({ status: 'ready', items })))),
    catchError(error => of({ status: 'error', message: error.message })),
  );
}
