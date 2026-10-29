import { Component, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

type Book = { id: string; title: string; publishedAt: string };

@Component({
  selector: 'book-tile', standalone: true, imports: [DatePipe],
  template: `
    <h3>{{ book().title }}</h3>
    <time>{{ book().publishedAt | date:'dd.MM.yyyy':'UTC' }}</time>
    <button type="button" (click)="chosen.emit(book().id)">Выбрать</button>
  `,
})
export class BookTile {
  book = input.required<Book>();
  chosen = output<string>();
}

@Component({
  selector: 'library-demo', standalone: true, imports: [BookTile],
  template: `
    <book-tile [book]="item" (chosen)="selected.set($event)" />
    <p>Выбран ID: {{ selected() }}</p>
  `,
})
export class LibraryDemo {
  item: Book = { id: 'b7', title: 'HTTP', publishedAt: '2026-10-20T00:00:00Z' };
  selected = signal('');
}

