import { map } from 'rxjs';

export function createDashboard(http) {
  const items$ = http.get('/api/issues').pipe(map(response => response.items));
  return { items$, count$: items$.pipe(map(items => items.length)) };
}
