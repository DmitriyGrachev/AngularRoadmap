import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-library-demo',
  standalone: true,
  template: `
    <h2>Книги</h2>
    @if (books.length) {
      <ul>
        @for (book of books; track book.id) {
          <li>
            <button type="button" (click)="selected.set(book.id)">
              {{ book.name }}
            </button>
          </li>
        }
      </ul>
    } @else { <p>Книг пока нет</p> }
    <p>Выбрано: {{ selected() ?? 'ничего' }}</p>
  `,
})
export class LibraryDemo {
  books = [{ id: 'b1', name: 'Алгоритмы' }, { id: 'b2', name: 'Сети' }];
  selected = signal<string | null>(null);
}

