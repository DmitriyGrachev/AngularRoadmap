import { mergeMap } from 'rxjs';

export function searchLatest(queries$, request) {
  return queries$.pipe(mergeMap(query => request(query)));
}
