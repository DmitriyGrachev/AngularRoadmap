import { catchError, map, mergeMap, of } from 'rxjs';

export function saveRequests(submits$, save) {
  return submits$.pipe(mergeMap(dto => save(dto).pipe(
    map(item => ({ ok: true, item })),
    catchError(error => of({ ok: false, message: error.message })),
  )));
}
