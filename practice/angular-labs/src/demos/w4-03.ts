import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, throwError, timer } from 'rxjs';

type View = { kind: 'loading' } | { kind: 'empty' }
  | { kind: 'success'; titles: string[] } | { kind: 'error'; message: string };

@Component({
  selector: 'catalog-state-demo', standalone: true,
  template: `
    <button type="button" (click)="load(false)">Пустой каталог</button>
    <button type="button" (click)="load(true)">Сбой</button>
    <p>{{ state().kind }}</p>
  `,
})
export class CatalogStateDemo {
  state = signal<View>({ kind: 'empty' });
  private destroyRef = inject(DestroyRef);
  load(fail: boolean) {
    this.state.set({ kind: 'loading' });
    timer(400).pipe(
      switchMap(() => fail ? throwError(() => new Error('Каталог недоступен')) : of<string[]>([])),
      map(titles => titles.length
        ? ({ kind: 'success', titles } as const)
        : ({ kind: 'empty' } as const)),
      catchError(() => of({ kind: 'error', message: 'Повторите загрузку' } as const)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(state => this.state.set(state));
  }
}

