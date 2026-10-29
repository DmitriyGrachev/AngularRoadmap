import { Component, computed, signal } from '@angular/core';

@Component({
  selector: 'library-state-demo', standalone: true,
  template: `
    <button type="button" (click)="toggleUnread()">
      Только непрочитанные: {{ onlyUnread() }}
    </button>
    <p>Непрочитанных всего: {{ unreadCount() }}</p>
    @for (book of visible(); track book.id) {
      <p>{{ book.title }}
        <button type="button" (click)="read(book.id)">Прочитано</button>
      </p>
    } @empty { <p>Подходящих книг нет</p> }
  `,
})
export class LibraryStateDemo {
  books = signal([
    { id: 'a', title: 'Сети', read: false },
    { id: 'b', title: 'Java', read: true },
  ]);
  onlyUnread = signal(false);
  toggleUnread() { this.onlyUnread.update(value => !value); }
  visible = computed(() => this.books().filter(
    book => !this.onlyUnread() || !book.read,
  ));
  unreadCount = computed(() => this.books().filter(book => !book.read).length);
  read(id: string) {
    this.books.update(books => books.map(book =>
      book.id === id ? { ...book, read: true } : book,
    ));
  }
}

