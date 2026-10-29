import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it } from 'vitest';
import { BookApi } from './book-api';

describe('BookApi из w4-02', () => {
  it('не отправляет до подписки, каждая подписка независима', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(BookApi);
    const http = TestBed.inject(HttpTestingController);
    const page$ = api.list('сети');
    http.expectNone('/api/books?q=%D1%81%D0%B5%D1%82%D0%B8');
    const totals: number[] = [];
    page$.subscribe(page => totals.push(page.total));
    page$.subscribe(page => totals.push(page.total));
    const requests = http.match(request => request.url === '/api/books');
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.request.params.get('q')).toBe('сети');
      request.flush({ items: [{ id: 'b1', title: 'Сети' }], total: 1 });
    }
    expect(totals).toEqual([1, 1]);
    http.verify();
  });
});
