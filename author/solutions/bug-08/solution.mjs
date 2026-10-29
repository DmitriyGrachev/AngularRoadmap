import { switchMap } from 'rxjs';

export function searchLatest(queries$, request) {
  return queries$.pipe(switchMap(query => request(query)));
}
