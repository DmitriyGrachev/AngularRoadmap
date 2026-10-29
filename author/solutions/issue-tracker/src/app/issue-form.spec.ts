import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, expect, it, vi } from 'vitest';
import { IssueForm } from './issue-form';

describe('Форма заявки', () => {
  it('сохраняет черновик и снимает pending после серверной ошибки', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'new', component: IssueForm }]), provideHttpClient(), provideHttpClientTesting()] });
    const harness = await RouterTestingHarness.create();
    const form = await harness.navigateByUrl('/new', IssueForm), http = TestBed.inject(HttpTestingController);
    form.form.patchValue({ title: 'Сохранённый черновик', description: 'Не терять при 400', priority: 'HIGH' }); form.submit(); form.submit();
    const request = http.expectOne('/api/issues');
    expect(form.pending()).toBe(true);
    request.flush({ message: 'Проверьте поля.', fieldErrors: { title: ['Название занято.'] } }, { status: 400, statusText: 'Bad Request' });
    expect(form.pending()).toBe(false); expect(form.form.controls.title.value).toBe('Сохранённый черновик'); expect(form.form.controls.description.value).toBe('Не терять при 400'); expect(form.titleError()).toBe('Название занято.'); http.verify();
  });
  it('не показывает редактируемую форму до ответа и при неизвестном ID', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'issues/:id/edit', component: IssueForm }]), provideHttpClient(), provideHttpClientTesting()] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/issues/missing/edit', IssueForm);
    const http = TestBed.inject(HttpTestingController);
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
    http.expectOne('/api/issues/missing').flush({ message: 'Не найдена' }, { status: 404, statusText: 'Not Found' }); harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Заявка не найдена');
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull(); http.verify();
  });
  it('повторяет неудачную загрузку того же ID и заполняет форму только после успеха', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'issues/:id/edit', component: IssueForm }]), provideHttpClient(), provideHttpClientTesting()] });
    const harness = await RouterTestingHarness.create();
    const form = await harness.navigateByUrl('/issues/test-1/edit', IssueForm), http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/issues/test-1').flush({ message: 'Временно недоступно' }, { status: 500, statusText: 'Internal Server Error' }); harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
    const retry = harness.routeNativeElement?.querySelector<HTMLButtonElement>('button');
    expect(retry?.textContent).toContain('Повторить'); retry!.click(); harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
    http.expectOne('/api/issues/test-1').flush({ id: 'test-1', title: 'Загруженная заявка', description: 'Описание', status: 'IN_PROGRESS', priority: 'HIGH', createdAt: '2026-10-20T12:00:00Z' }); harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('form')).not.toBeNull(); expect(form.form.controls.title.value).toBe('Загруженная заявка'); expect(form.id).toBe('test-1'); http.verify();
  });
  it('завершает подписку при закрытии формы и не переходит по позднему ответу', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'new', component: IssueForm }]), provideHttpClient(), provideHttpClientTesting()] });
    const harness = await RouterTestingHarness.create();
    const form = await harness.navigateByUrl('/new', IssueForm), http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    form.form.patchValue({ title: 'Незавершённый запрос' }); form.submit();
    const request = http.expectOne('/api/issues'); expect(form.pending()).toBe(true);
    harness.fixture.destroy();
    expect(request.cancelled).toBe(true); expect(form.pending()).toBe(false);
    expect(() => request.flush({ id: 'late-response' })).toThrow(/cancelled/i);
    expect(navigate).not.toHaveBeenCalled(); http.verify();
  });
});
