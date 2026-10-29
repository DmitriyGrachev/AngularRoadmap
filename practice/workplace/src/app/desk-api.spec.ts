import { firstValueFrom } from 'rxjs';
import { DeskApi } from './desk-api';

describe('DeskApi local asynchronous contract', () => {
  let api: DeskApi;
  beforeEach(() => { vi.useFakeTimers(); api = new DeskApi(); });
  afterEach(() => vi.useRealTimers());
  async function finish<T>(promise: Promise<T>): Promise<T> {
    const [result] = await Promise.all([promise, vi.runAllTimersAsync()]);
    return result;
  }

  it('filters before slicing and returns a useful total on later pages', async () => {
    const page = await finish(firstValueFrom(api.list({ q: '', status: 'open', page: 2 })));
    expect(page.total).toBe(8);
    expect(page.items).toHaveLength(2);
    expect(page.items.every(item => item.status === 'open')).toBe(true);
    expect(page.page).toBe(2);
  });
  it('searches case-insensitively in title and identifier, without mutating storage', async () => {
    const page = await finish(firstValueFrom(api.list({ q: 'vpn', status: 'all', page: 1 })));
    expect(page.items.map(item => item.id)).toEqual(['SD-101', 'SD-113']);
    page.items[0].title = 'outside mutation';
    const actual = await finish(firstValueFrom(api.get('SD-101')));
    expect(actual.title).toBe('VPN не подключается после обновления');
    const byId = await finish(firstValueFrom(api.list({ q: 'sd-113', status: 'all', page: 1 })));
    expect(byId.items.map(item => item.id)).toEqual(['SD-113']);
  });
  it('clamps a page beyond the last result and distinguishes an empty result', async () => {
    const last = await finish(firstValueFrom(api.list({ q: '', status: 'all', page: 999 })));
    expect(last.page).toBe(3);
    expect(last.items).toHaveLength(6);
    const empty = await finish(firstValueFrom(api.list({ q: 'no-match-xyz', status: 'all', page: 8 })));
    expect(empty).toMatchObject({ total: 0, page: 1, items: [] });
  });
  it('persists normalized edits and leaves other records unchanged', async () => {
    const saved = await finish(firstValueFrom(api.update('SD-101', { title: '  Новый заголовок  ', description: 'Детали' })));
    expect(saved.title).toBe('Новый заголовок');
    expect((await finish(firstValueFrom(api.get('SD-101')))).description).toBe('Детали');
    expect((await finish(firstValueFrom(api.get('SD-102')))).title).toBe('Доступ к отчёту продаж');
  });
  it('rejects invalid patches atomically, including server-only business validation', async () => {
    const invalid = firstValueFrom(api.update('SD-101', { title: '   ', description: 'should not save' }));
    const invalidCheck = expect(invalid).rejects.toMatchObject({ status: 422, fields: { title: expect.any(String) } });
    await Promise.all([invalidCheck, vi.runAllTimersAsync()]);
    expect((await finish(firstValueFrom(api.get('SD-101')))).description).not.toBe('should not save');
    const unassigned = firstValueFrom(api.update('SD-101', { status: 'in-progress', assignee: '' }));
    const check = expect(unassigned).rejects.toMatchObject({ status: 422, fields: { assignee: expect.any(String) } });
    await Promise.all([check, vi.runAllTimersAsync()]);
  });
  it('fails only the next subscribed list request and can recover on the same service', async () => {
    api.failNextList();
    const result = firstValueFrom(api.list({ q: '', status: 'all', page: 1 }));
    const check = expect(result).rejects.toMatchObject({ status: 503 });
    await Promise.all([check, vi.runAllTimersAsync()]);
    expect((await finish(firstValueFrom(api.list({ q: '', status: 'all', page: 1 })))).total).toBe(18);
  });
  it('does not save when a write fails and supports a later retry', async () => {
    api.failNextSave();
    const result = firstValueFrom(api.update('SD-101', { title: 'Не сохранено' }));
    const check = expect(result).rejects.toMatchObject({ status: 503 });
    await Promise.all([check, vi.runAllTimersAsync()]);
    expect((await finish(firstValueFrom(api.get('SD-101')))).title).toBe('VPN не подключается после обновления');
    expect((await finish(firstValueFrom(api.update('SD-101', { title: 'Сохранено повторно' })))).title).toBe('Сохранено повторно');
  });
  it('returns 404 for a missing record', async () => {
    const result = firstValueFrom(api.get('SD-999'));
    const check = expect(result).rejects.toMatchObject({ status: 404 });
    await Promise.all([check, vi.runAllTimersAsync()]);
  });
});
