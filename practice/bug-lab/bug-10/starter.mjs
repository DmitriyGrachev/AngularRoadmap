import { signal } from '@angular/core';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';

export function createLoader(triggers$, request) {
  const loading = signal(false);
  const state$ = triggers$.pipe(
    tap(() => loading.set(true)),
    switchMap(key => request(key).pipe(
      map(items => ({ status: 'ready', items })),
      catchError(error => of({ status: 'error', message: error.message })),
    )),
    finalize(() => loading.set(false)),
  );
  return { loading, state$ };
}
