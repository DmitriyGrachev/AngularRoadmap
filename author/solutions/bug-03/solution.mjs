import { map, shareReplay } from 'rxjs';

export function createDashboard(http) {
  const items$ = http.get('/api/issues').pipe(
    map(response => response.items),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  return { items$, count$: items$.pipe(map(items => items.length)) };
}
