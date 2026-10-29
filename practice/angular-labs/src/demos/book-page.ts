import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'book-page', standalone: true, imports: [RouterLink],
  template: `
    <a routerLink="/books">К списку</a>
    <h2>Книга {{ id() }}</h2>
  `,
})
export class BookPage {
  id = signal('');
  private route = inject(ActivatedRoute);
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.id.set(params.get('id') ?? '');
    });
  }
}

