import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IssueService } from './issue.service';
import { Issue } from './models';

describe('IssueService HTTP-контракт', () => {
  let service: IssueService, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(IssueService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('передаёт параметры отдельно от URL и сохраняет envelope страницы', () => {
    let total: number | undefined;
    service.list({ page: '2', size: '10', q: 'форма', status: 'OPEN' }).subscribe(page => total = page.total);
    const request = http.expectOne(request => request.url === '/api/issues' && request.params.get('page') === '2' && request.params.get('size') === '10' && request.params.get('q') === 'форма' && request.params.get('status') === 'OPEN');
    expect(request.request.method).toBe('GET'); request.flush({ items: [], total: 25, page: 2, size: 10 }); expect(total).toBe(25);
  });
  it('не превращает ошибку сервера в успешный пустой список', () => {
    let status = 0, success = false;
    service.list({ page: '0' }).subscribe({ next: () => success = true, error: (error: HttpErrorResponse) => status = error.status });
    http.expectOne('/api/issues?page=0').flush({ message: 'Ошибка' }, { status: 500, statusText: 'Internal Server Error' });
    expect(status).toBe(500); expect(success).toBe(false);
  });
  it('создаёт заявку через POST и получает ID от сервера', () => {
    let savedId = '';
    service.create({ title: 'Новая заявка', description: 'Описание', priority: 'HIGH' }).subscribe(issue => savedId = issue.id);
    const request = http.expectOne('/api/issues'); expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual({ title: 'Новая заявка', description: 'Описание', priority: 'HIGH' });
    request.flush({ id: 'server-1', title: 'Новая заявка', description: 'Описание', status: 'OPEN', priority: 'HIGH', createdAt: '2026-10-20T12:00:00Z' } satisfies Issue);
    expect(savedId).toBe('server-1');
  });
});
