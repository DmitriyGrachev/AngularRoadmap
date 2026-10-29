import { interval, switchMap, takeUntil } from 'rxjs';

export function ticks(start$, destroy$, scheduler) {
  return start$.pipe(
    switchMap(() => interval(10, scheduler)),
    takeUntil(destroy$),
  );
}
