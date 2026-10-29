import { interval, switchMap, takeUntil } from 'rxjs';

export function ticks(start$, destroy$, scheduler) {
  return start$.pipe(
    takeUntil(destroy$),
    switchMap(() => interval(10, scheduler)),
  );
}
