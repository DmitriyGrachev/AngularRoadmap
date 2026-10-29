import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DeskApi } from './desk-api';
import { ListPage } from './list-page';
import { DetailPage } from './detail-page';

describe('workplace pages with the real local API', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideRouter([{ path: 'requests', component: ListPage }, { path: 'requests/:id', component: DetailPage }])],
  }));
  const settle = async (harness: RouterTestingHarness, ms = 400) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    harness.detectChanges();
  };
  it('renders URL-filtered results and preserves the query in the detail link', async () => {
    const harness = await RouterTestingHarness.create('/requests?q=VPN&status=open');
    expect(harness.routeNativeElement?.textContent).toContain('Загружаем');
    await settle(harness);
    const links = harness.routeNativeElement!.querySelectorAll<HTMLAnchorElement>('a.request-link');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toContain('q=VPN');
    expect(links[0].getAttribute('href')).toContain('status=open');
  });
  it('renders an API failure distinctly from no matching results', async () => {
    TestBed.inject(DeskApi).failNextList();
    const harness = await RouterTestingHarness.create('/requests');
    await settle(harness);
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')?.textContent).toContain('недоступен');
    expect(harness.routeNativeElement?.textContent).not.toContain('Ничего не найдено');
  });
  it('preserves the edited title after a failed save and marks a successful retry clean', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/requests/SD-101?q=VPN', DetailPage);
    await settle(harness);
    const title = harness.routeNativeElement!.querySelector<HTMLInputElement>('#title')!;
    title.value = 'VPN всё ещё не работает';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    harness.detectChanges();
    TestBed.inject(DeskApi).failNextSave();
    harness.routeNativeElement!.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    await settle(harness, 550);
    expect(title.value).toBe('VPN всё ещё не работает');
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')?.textContent).toContain('Сохранение не выполнено');
    expect(page.form.dirty).toBe(true);
    harness.routeNativeElement!.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(harness, 550);
    expect(harness.routeNativeElement?.textContent).toContain('Изменения сохранены');
    expect(page.form.pristine).toBe(true);
    title.value = 'Ещё одна правка после сохранения';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('Изменения сохранены');
  });
  it('does not submit a locally invalid title', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/requests/SD-101', DetailPage);
    await settle(harness);
    page.form.controls.title.setValue('abc');
    harness.routeNativeElement!.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('#title-error')?.textContent).toContain('5');
    expect(page.saving()).toBe(false);
  });
});
