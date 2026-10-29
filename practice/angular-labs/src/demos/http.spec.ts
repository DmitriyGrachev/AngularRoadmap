import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect } from 'vitest';

describe('запрос каталога', () => {
  it('передаёт страницу и читает items', () => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
    ] });
    const http = TestBed.inject(HttpClient);
    const control = TestBed.inject(HttpTestingController);
    let titles: string[] = [];
    http.get<{ items: string[] }>('/api/books', { params: { page: 2 } })
      .subscribe(page => titles = page.items);
    const request = control.expectOne(r => r.url === '/api/books' && r.params.get('page') === '2');
    expect(request.request.method).toBe('GET');
    request.flush({ items: ['Сети'] });
    expect(titles).toEqual(['Сети']);
    control.verify();
  });
});

