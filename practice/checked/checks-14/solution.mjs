import { mergeMap, map } from 'rxjs';
export function saveOnce(clicks$, save) {
  // TODO: busy-клики игнорируются, ошибка не завершает clicks$.
  return clicks$.pipe(mergeMap(payload => save(payload).pipe(map(issue => ({ kind: 'saved', issue })))));
}
