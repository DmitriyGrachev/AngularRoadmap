import { describe, expect, it } from 'vitest';

type Book = { id: string; available: boolean };
function availableBooks(items: Book[], onlyAvailable: boolean): Book[] {
  return onlyAvailable ? items.filter(item => item.available) : items;
}

describe('availableBooks', () => {
  const books = [
    { id: 'a', available: true },
    { id: 'b', available: false },
  ];
  it('исключает недоступную книгу', () => {
    expect(availableBooks(books, true).map(book => book.id)).toEqual(['a']);
  });
  it('оставляет обе при выключенном фильтре', () => {
    expect(availableBooks(books, false)).toEqual(books);
  });
});

