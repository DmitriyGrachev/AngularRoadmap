import { defer, of } from 'rxjs';

type Book = { id: string; title: string };
type BookPage = { items: Book[]; total: number };
const demo$ = defer(() => {
  console.log('Запуск источника');
  return of<BookPage>({ items: [{ id: 'b1', title: 'Сети' }], total: 1 });
});
demo$.subscribe(page => console.log('A', page.total));
demo$.subscribe(page => console.log('B', page.total));
