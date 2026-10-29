import { catchError, exhaustMap, map, of } from 'rxjs';

export function saveRequests(submits$, save) {
  return submits$.pipe(exhaustMap(dto => save(dto).pipe(
    map(item => ({ ok: true, item })),
    catchError(error => of({ ok: false, message: error.message })),
  )));
}
