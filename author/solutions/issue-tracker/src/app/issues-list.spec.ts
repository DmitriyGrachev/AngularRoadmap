import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, expect, it } from 'vitest';
import { IssuesList } from './issues-list';

describe('Поиск после навигации', () => {
  it('повторяет одинаковый ввод, когда навигация очистила query parameter', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'issues', component: IssuesList }]), provideHttpClient(), provideHttpClientTesting()] });
    const harness = await RouterTestingHarness.create();
    const list = await harness.navigateByUrl('/issues', IssuesList), http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/issues?page=0&size=10').flush({ items: [], total: 32, page: 0, size: 10 });
    const search = () => list.search({ target: { value: 'поиск' } } as unknown as Event);
    search(); await new Promise(resolve => setTimeout(resolve, 300));
    http.expectOne(request => request.params.get('q') === 'поиск').flush({ items: [], total: 8, page: 0, size: 10 });
    await harness.navigateByUrl('/issues');
    http.expectOne('/api/issues?page=0&size=10').flush({ items: [], total: 32, page: 0, size: 10 });
    search(); await new Promise(resolve => setTimeout(resolve, 300));
    http.expectOne(request => request.params.get('q') === 'поиск').flush({ items: [], total: 8, page: 0, size: 10 });
    expect(list.state().data?.total).toBe(8); http.verify();
  });
  it('сброс отменяет отложенный ввод и не возвращает следующую страницу назад', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'issues', component: IssuesList }]), provideHttpClient(), provideHttpClientTesting()] });
    const harness = await RouterTestingHarness.create();
    const list = await harness.navigateByUrl('/issues', IssuesList), http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/issues?page=0&size=10').flush({ items: [], total: 32, page: 0, size: 10 });
    list.search({ target: { value: 'отложенный ввод' } } as unknown as Event); list.reset();
    await harness.navigateByUrl('/issues?page=1'); await new Promise(resolve => setTimeout(resolve, 300));
    expect(list.query().get('page')).toBe('1'); expect(list.query().get('q')).toBeNull();
    http.expectOne('/api/issues?page=1&size=10').flush({ items: [], total: 32, page: 1, size: 10 }); http.verify();
  });
});
