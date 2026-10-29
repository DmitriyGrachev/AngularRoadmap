import assert from 'node:assert/strict';
import '@angular/compiler';
import { convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, VirtualTimeScheduler, defer, of, throwError } from 'rxjs';

const target = checks => ({ solutionFile: 'solution.mjs', checks });
const route = (values, kind = 'queryParamMap') => {
  const changes = new BehaviorSubject(convertToParamMap(values));
  return { changes, value: { snapshot: { [kind]: changes.value }, [kind]: changes.asObservable() } };
};
const receive = observable => {
  const values = [], errors = [];
  let complete = false;
  const subscription = observable.subscribe({ next: value => values.push(value), error: error => errors.push(error), complete: () => { complete = true; } });
  return { values, errors, subscription, get complete() { return complete; } };
};

export const bugTargets = {
  'bug-01': target({
    'search-after-error': solution => {
      const queries = new Subject(), requested = [];
      const output = receive(solution.search(queries, query => {
        requested.push(query);
        return query === 'сбой' ? throwError(() => new Error('Нет сети')) : of([{ id: query }]);
      }));
      try {
        queries.next('сбой'); queries.next('сеть'); queries.next('');
        assert.deepEqual(requested, ['сбой', 'сеть', ''], 'После ошибки следующий ввод и очистка должны запускать новые чтения.');
        assert.deepEqual(output.values, [{ status: 'error', message: 'Нет сети' }, { status: 'ready', items: [{ id: 'сеть' }] }, { status: 'ready', items: [{ id: '' }] }]);
        assert.equal(output.complete, false, 'Ошибка одного запроса не завершает поток ввода.');
      } finally { output.subscription.unsubscribe(); }
    },
    'each-error-is-local': solution => {
      const queries = new Subject();
      const output = receive(solution.search(queries, query => query === 'ok' ? of([]) : throwError(() => new Error(query))));
      try {
        queries.next('503'); queries.next('timeout'); queries.next('ok');
        assert.deepEqual(output.values, [{ status: 'error', message: '503' }, { status: 'error', message: 'timeout' }, { status: 'ready', items: [] }], 'Два отказа подряд тоже должны оставлять возможность поиска.');
        assert.deepEqual(output.errors, []);
      } finally { output.subscription.unsubscribe(); }
    },
  }),
  'bug-02': target({
    'back-restores-filter': solution => {
      const source = route({ status: 'OPEN', page: '3' });
      const model = solution.createFilters(source.value, { navigate: async () => true });
      try {
        assert.equal(model.status(), 'OPEN');
        source.changes.next(convertToParamMap({ status: 'DONE', page: '1' }));
        assert.equal(model.status(), 'DONE', 'Тот же экземпляр должен прочитать новый queryParamMap.');
        source.changes.next(convertToParamMap({ status: 'OPEN', page: '3' }));
        assert.equal(model.status(), 'OPEN', 'Back восстанавливает фильтр из URL.');
        source.changes.next(convertToParamMap({ status: 'BROKEN' }));
        assert.equal(model.status(), 'ALL', 'Неизвестный статус нормализуется в ALL.');
        source.changes.next(convertToParamMap({}));
        assert.equal(model.status(), 'ALL');
      } finally { model.destroy(); }
    },
    'selection-writes-url-and-cleans-up': async solution => {
      const source = route({ status: 'OPEN' }), calls = [];
      const model = solution.createFilters(source.value, { navigate: async (...args) => { calls.push(args); return true; } });
      await model.select('DONE');
      assert.deepEqual(calls, [[[], { queryParams: { status: 'DONE', page: 1 }, queryParamsHandling: 'merge' }]], 'Выбор пишет status и сбрасывает page, сохраняя другие query parameters.');
      assert.equal(model.status(), 'OPEN', 'Состояние меняется после подтверждённого URL, а не раньше навигации.');
      source.changes.next(convertToParamMap({ status: 'DONE' }));
      assert.equal(model.status(), 'DONE');
      model.destroy();
      source.changes.next(convertToParamMap({ status: 'IN_PROGRESS' }));
      assert.equal(model.status(), 'DONE', 'После destroy подписка не обновляет состояние.');
    },
  }),
  'bug-03': target({
    'one-cold-request': solution => {
      const response = new Subject();
      let starts = 0;
      const dashboard = solution.createDashboard({ get: url => { assert.equal(url, '/api/issues'); return defer(() => { starts++; return response; }); } });
      const items = receive(dashboard.items$), count = receive(dashboard.count$);
      try {
        assert.equal(starts, 1, 'Два потребителя одного dashboard должны разделять один HTTP-запрос.');
        response.next({ items: [{ id: 'Q-4' }, { id: 'Q-8' }] }); response.complete();
        assert.deepEqual(items.values, [[{ id: 'Q-4' }, { id: 'Q-8' }]]);
        assert.deepEqual(count.values, [2]);
      } finally { items.subscription.unsubscribe(); count.subscription.unsubscribe(); }
    },
    'late-counter-uses-result': solution => {
      let starts = 0;
      const dashboard = solution.createDashboard({ get: () => defer(() => { starts++; return of({ items: [] }); }) });
      const items = receive(dashboard.items$), count = receive(dashboard.count$);
      assert.deepEqual(items.values, [[]]); assert.deepEqual(count.values, [0]);
      assert.equal(starts, 1, 'Поздний счётчик читает полученный пустой результат без повторного GET.');
    },
    'unused-request-is-cancelled': solution => {
      const response = new Subject();
      const dashboard = solution.createDashboard({ get: () => response.asObservable() });
      const first = dashboard.items$.subscribe(), second = dashboard.count$.subscribe();
      first.unsubscribe();
      assert.equal(response.observed, true, 'Один оставшийся потребитель ещё ждёт ответ.');
      second.unsubscribe();
      assert.equal(response.observed, false, 'Без потребителей незавершённое чтение освобождается.');
    },
  }),
  'bug-04': target({
    'computed-invalidates': solution => {
      const board = solution.createBoard([{ id: 'K-1', status: 'OPEN' }]);
      assert.equal(board.openCount(), 1);
      board.add({ id: 'K-2', status: 'OPEN' });
      assert.equal(board.openCount(), 2, 'Прочитанный computed должен пересчитаться после add.');
      board.setStatus('K-1', 'DONE');
      assert.equal(board.openCount(), 1, 'Смена статуса должна инвалидировать computed.');
      board.setStatus('missing', 'DONE');
      assert.equal(board.openCount(), 1);
    },
    'history-and-input-stay-unchanged': solution => {
      const input = Object.freeze([Object.freeze({ id: 'T-7', status: 'OPEN' })]);
      const board = solution.createBoard(input), snapshot = board.issues();
      board.setStatus('T-7', 'DONE');
      board.add({ id: 'T-8', status: 'OPEN' });
      assert.deepEqual(input, [{ id: 'T-7', status: 'OPEN' }], 'Команда не меняет входные объекты.');
      assert.deepEqual(snapshot, [{ id: 'T-7', status: 'OPEN' }], 'Ранее полученный снимок остаётся прежним.');
      assert.deepEqual(board.issues(), [{ id: 'T-7', status: 'DONE' }, { id: 'T-8', status: 'OPEN' }]);
    },
  }),
  'bug-05': target({
    'destroy-stops-inner-timer': solution => {
      const scheduler = new VirtualTimeScheduler(undefined, 70), start = new Subject(), destroy = new Subject();
      const output = receive(solution.ticks(start, destroy, scheduler));
      try {
        scheduler.schedule(() => start.next(), 0); scheduler.schedule(() => destroy.next(), 35); scheduler.flush();
        assert.deepEqual(output.values, [0, 1, 2], 'После destroy в 35 мс таймер не должен выдавать значения в 40, 50, 60 мс.');
        assert.equal(output.complete, true, 'Вся цепочка должна завершиться при destroy.');
      } finally { output.subscription.unsubscribe(); }
    },
    'restart-keeps-one-timer': solution => {
      const scheduler = new VirtualTimeScheduler(undefined, 80), start = new Subject(), destroy = new Subject();
      const output = receive(solution.ticks(start, destroy, scheduler));
      try {
        scheduler.schedule(() => start.next(), 0); scheduler.schedule(() => start.next(), 25); scheduler.schedule(() => destroy.next(), 47); scheduler.flush();
        assert.deepEqual(output.values, [0, 1, 0, 1], 'Повторный start заменяет отсчёт, destroy освобождает и новый таймер.');
      } finally { output.subscription.unsubscribe(); }
    },
  }),
  'bug-06': target({
    'failed-submit-keeps-draft': async solution => {
      const form = solution.createIssueForm({ title: 'Сбой загрузки', description: 'Шаги 1 → 2' });
      form.controls.title.markAsDirty();
      const result = await solution.submit(form, async () => { throw new Error('503'); });
      assert.deepEqual(form.getRawValue(), { title: 'Сбой загрузки', description: 'Шаги 1 → 2' }, 'Серверная ошибка не стирает введённый текст.');
      assert.equal(form.enabled, true, 'Повторная отправка доступна после ошибки.');
      assert.equal(form.dirty, true, 'Неуспешная попытка не превращает черновик в pristine.');
      assert.deepEqual(result, { ok: false, message: '503' });
    },
    'retry-sends-preserved-values': async solution => {
      const form = solution.createIssueForm({ title: 'Повтор', description: '' });
      const first = solution.submit(form, async () => { assert.equal(form.disabled, true); throw new Error('Нет сети'); });
      await first;
      form.controls.title.setValue('Новая версия');
      const payloads = [];
      const result = await solution.submit(form, async dto => { assert.equal(form.disabled, true); payloads.push(dto); return { id: 'NEW-8' }; });
      assert.deepEqual(payloads, [{ title: 'Новая версия', description: '' }], 'Повтор читает текущий черновик вместе с необязательным полем.');
      assert.deepEqual(result, { ok: true, id: 'NEW-8' });
      assert.deepEqual(form.getRawValue(), { title: '', description: '' }, 'Успешная отправка очищает форму.');
      assert.equal(form.enabled, true);
    },
  }),
  'bug-07': target({
    'reused-route-loads-new-id': solution => {
      const source = route({ id: 'A-1' }, 'paramMap'), requested = [];
      const output = receive(solution.details(source.value, id => { requested.push(id); return of({ id, title: `Заявка ${id}` }); }));
      try {
        source.changes.next(convertToParamMap({ id: 'B-2' }));
        source.changes.next(convertToParamMap({ id: 'B-2' }));
        assert.deepEqual(requested, ['A-1', 'B-2'], 'Повторное использование компонента требует наблюдать ID; одинаковый ID не загружать повторно.');
        assert.deepEqual(output.values, [{ id: 'A-1', title: 'Заявка A-1' }, { id: 'B-2', title: 'Заявка B-2' }]);
      } finally { output.subscription.unsubscribe(); }
    },
    'route-change-cancels-old-detail': solution => {
      const source = route({ id: 'A-1' }, 'paramMap'), old = new Subject(), current = new Subject();
      const output = receive(solution.details(source.value, id => id === 'A-1' ? old : current));
      try {
        source.changes.next(convertToParamMap({ id: 'C-9' }));
        current.next({ id: 'C-9' }); old.next({ id: 'A-1' });
        assert.deepEqual(output.values, [{ id: 'C-9' }], 'Поздний ответ старого маршрута не заменяет текущую деталь.');
        assert.equal(old.observed, false, 'Предыдущее чтение должно быть отписано.');
      } finally { output.subscription.unsubscribe(); }
    },
  }),
  'bug-08': target({
    'latest-search-wins': solution => {
      const queries = new Subject(), old = new Subject(), current = new Subject();
      const output = receive(solution.searchLatest(queries, query => query === 'с' ? old : current));
      try {
        queries.next('с'); queries.next('сеть');
        current.next(['сеть']); old.next(['старое с']);
        assert.deepEqual(output.values, [['сеть']], 'Порядок ответов не должен менять результат актуального поиска.');
        assert.equal(old.observed, false, 'Новый ввод отписывает старое чтение.');
      } finally { output.subscription.unsubscribe(); }
    },
    'clear-also-replaces-request': solution => {
      const queries = new Subject(), old = new Subject(), all = new Subject(), calls = [];
      const output = receive(solution.searchLatest(queries, query => { calls.push(query); return query ? old : all; }));
      try {
        queries.next('узкий'); queries.next(''); all.next(['все']); old.next(['устарело']);
        assert.deepEqual(calls, ['узкий', '']);
        assert.deepEqual(output.values, [['все']], 'Очистка поиска — новый запрос полного набора, а не пропуск события.');
      } finally { output.subscription.unsubscribe(); }
    },
  }),
  'bug-09': target({
    'disabled-id-remains-in-dto': solution => {
      const form = solution.createEditForm({ id: 'R-17', title: 'До' });
      form.controls.title.setValue('После');
      assert.equal(form.controls.id.disabled, true, 'ID остаётся недоступным для ввода.');
      assert.deepEqual(solution.toUpdate(form), { id: 'R-17', title: 'После' }, 'Disabled ID отсутствует в value, но обязателен в DTO редактирования.');
      assert.equal(form.controls.id.disabled, true, 'Сериализация не включает control ради чтения.');
    },
    'snapshot-payload-does-not-follow-form': solution => {
      const form = solution.createEditForm({ id: 'S-2', title: '' });
      const dto = solution.toUpdate(form);
      form.controls.title.setValue('Новый текст');
      assert.deepEqual(dto, { id: 'S-2', title: '' }, 'DTO — снимок всех полей на момент отправки.');
      assert.deepEqual(solution.toUpdate(form), { id: 'S-2', title: 'Новый текст' });
    },
  }),
  'bug-10': target({
    'loading-finishes-per-request': solution => {
      const triggers = new Subject(), requests = new Map([['ok', new Subject()], ['fail', new Subject()]]);
      const model = solution.createLoader(triggers, key => requests.get(key));
      const output = receive(model.state$);
      try {
        assert.equal(model.loading(), false);
        triggers.next('ok'); assert.equal(model.loading(), true);
        requests.get('ok').next(['X']); requests.get('ok').complete();
        assert.equal(model.loading(), false, 'loading завершается с текущим HTTP, а не с бесконечным потоком кнопки.');
        triggers.next('fail'); assert.equal(model.loading(), true);
        requests.get('fail').error(new Error('503'));
        assert.equal(model.loading(), false, 'Ошибка также завершает loading.');
        assert.deepEqual(output.values, [{ status: 'ready', items: ['X'] }, { status: 'error', message: '503' }]);
      } finally { output.subscription.unsubscribe(); }
    },
    'cancel-does-not-hide-new-loading': solution => {
      const triggers = new Subject(), old = new Subject(), current = new Subject(), pending = new Subject();
      const model = solution.createLoader(triggers, key => key === 'old' ? old : key === 'new' ? current : pending);
      const output = receive(model.state$);
      try {
        triggers.next('old'); triggers.next('new');
        assert.equal(old.observed, false);
        assert.equal(model.loading(), true, 'finalize старого запроса не выключает загрузку нового.');
        current.next([]); current.complete();
        assert.equal(model.loading(), false);
        triggers.next('pending');
        assert.equal(model.loading(), true);
      } finally { output.subscription.unsubscribe(); }
      assert.equal(model.loading(), false, 'Отписка во время активного запроса должна выключать загрузку.');
      assert.equal(pending.observed, false, 'Уход потребителя освобождает незавершённое чтение.');
    },
  }),
  'bug-11': target({
    'http-params-reach-request': solution => {
      const params = solution.buildParams({ status: 'IN_PROGRESS', page: 3, q: ' сеть & API ' });
      assert.equal(params.get('status'), 'IN_PROGRESS', 'set возвращает новый HttpParams; status должен попасть в него.');
      assert.equal(params.get('page'), '3');
      assert.equal(params.get('q'), 'сеть & API');
      const parsed = new URLSearchParams(params.toString());
      assert.equal(parsed.get('q'), 'сеть & API', 'Строка поиска кодируется как одно значение параметра.');
      assert.deepEqual([...parsed.keys()].sort(), ['page', 'q', 'status']);
    },
    'empty-and-separate-requests': solution => {
      const first = solution.buildParams({ status: 'DONE', page: 9, q: 'ошибка' });
      const second = solution.buildParams({ status: 'ALL', page: 1, q: '  ' });
      assert.equal(second.get('status'), null, 'ALL означает отсутствие фильтра status.');
      assert.equal(second.get('q'), null, 'Пустую нормализованную строку не отправлять.');
      assert.equal(second.get('page'), '1');
      assert.equal(first.get('page'), '9', 'Следующий вызов не меняет предыдущие параметры.');
      assert.equal(first.get('status'), 'DONE');
    },
  }),
  'bug-12': target({
    'double-click-does-not-double-post': solution => {
      const submits = new Subject(), pending = new Subject(), sent = [];
      const output = receive(solution.saveRequests(submits, dto => { sent.push(dto); return pending; }));
      try {
        submits.next({ title: 'Первая' }); submits.next({ title: 'Повторный клик' });
        assert.deepEqual(sent, [{ title: 'Первая' }], 'Пока запись не завершилась, повторный submit не создаёт ещё одну запись и не ставится в очередь.');
        pending.next({ id: 'N-1' }); pending.complete();
        assert.deepEqual(output.values, [{ ok: true, item: { id: 'N-1' } }]);
        assert.equal(sent.length, 1, 'После первого ответа отложенный дубль тоже не отправляется.');
      } finally { output.subscription.unsubscribe(); }
    },
    'error-allows-new-attempt': solution => {
      const submits = new Subject(), first = new Subject(), next = new Subject(), sent = [];
      const output = receive(solution.saveRequests(submits, dto => { sent.push(dto); return sent.length === 1 ? first : sent.length === 2 ? next : of({ id: 'N-3' }); }));
      try {
        submits.next({ title: 'До' }); first.error(new Error('503'));
        submits.next({ title: 'Исправлено' }); next.next({ id: 'N-2' }); next.complete();
        submits.next({ title: 'После успеха' });
        assert.deepEqual(sent, [{ title: 'До' }, { title: 'Исправлено' }, { title: 'После успеха' }]);
        assert.deepEqual(output.values, [{ ok: false, message: '503' }, { ok: true, item: { id: 'N-2' } }, { ok: true, item: { id: 'N-3' } }], 'Ошибка и успех снимают блокировку, сохраняя поток следующих попыток.');
      } finally { output.subscription.unsubscribe(); }
    },
  }),
};
