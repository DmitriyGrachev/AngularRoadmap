import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
export function watchValues(source$, destroyRef, onValue) {
  return source$.pipe(takeUntilDestroyed(destroyRef)).subscribe(onValue);
}
