import { signal } from '@angular/core';
import { catchError, defer, finalize, map, of, switchMap } from 'rxjs';

export function createLoader(triggers$, request) {
  const loading = signal(false);
  const state$ = triggers$.pipe(switchMap(key => defer(() => {
    loading.set(true);
    return request(key);
  }).pipe(
    map(items => ({ status: 'ready', items })),
    catchError(error => of({ status: 'error', message: error.message })),
    finalize(() => loading.set(false)),
  )));
  return { loading, state$ };
}
