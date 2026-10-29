import { exhaustMap, map, catchError, of } from 'rxjs';
export function saveOnce(clicks$, save) {
  return clicks$.pipe(exhaustMap(payload => save(payload).pipe(
    map(issue => ({ kind: 'saved', issue })),
    catchError(error => of({ kind: 'error', message: error instanceof Error ? error.message : 'Ошибка сохранения' }))
  )));
}
