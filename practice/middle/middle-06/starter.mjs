import { catchError, defer, map, mergeMap, of } from 'rxjs';
export function serializeWrites(commands$, save) {
  return commands$.pipe(mergeMap(command => defer(() => save(command)).pipe(
    map(value => ({ id: command.id, ok: true, value })),
    catchError(() => of({ id: command.id, ok: false, error: 'save-failed' })),
  )));
}

