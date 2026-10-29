import { catchError, concatMap, defer, map, of } from 'rxjs';
export function serializeWrites(commands$, save) {
  return commands$.pipe(concatMap(command => defer(() => save(command)).pipe(
    map(value => ({ id: command.id, ok: true, value })),
    catchError(() => of({ id: command.id, ok: false, error: 'save-failed' })),
  )));
}

