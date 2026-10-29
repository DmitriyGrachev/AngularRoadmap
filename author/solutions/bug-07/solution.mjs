import { distinctUntilChanged, map, switchMap } from 'rxjs';

export function details(route, request) {
  return route.paramMap.pipe(
    map(params => params.get('id')),
    distinctUntilChanged(),
    switchMap(id => request(id)),
  );
}
