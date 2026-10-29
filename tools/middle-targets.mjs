import assert from 'node:assert/strict';
import { basename, dirname, join } from 'node:path';

const target = (checks, solutionFile = 'solution.mjs') => Object.freeze({ solutionFile, checks: Object.freeze(checks) });
const frozen = value => { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); } return value; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const items = () => [{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }];
const filters = { q: '', statuses: [], page: 0, pageSize: 25, sort: 'updated' };
const editorInput = () => ({ title: 'Release', schedule: { start: 2, end: 5 }, rows: [{ id: 'a', code: 'API', quantity: 2 }, { id: 'b', code: 'UI', quantity: 1 }] });

async function formTypes(context) {
  const ts = (await import('typescript')).default;
  const file = join(dirname(context.solutionFile), '.middle-types.ts').replaceAll('\\', '/');
  const source = `import {createEditor,type EditorInput} from './${basename(context.solutionFile)}';
const input:EditorInput={title:'abc',schedule:{start:1,end:2},rows:[{id:'a',code:'X',quantity:1}]};
const form=createEditor(input);
const title:string=form.controls.title.value;
const start:number=form.controls.schedule.controls.start.value;
const end:number=form.controls.schedule.controls.end.value;
const id:string=form.controls.rows.at(0).controls.id.value;
const code:string=form.controls.rows.at(0).controls.code.value;
const quantity:number=form.controls.rows.at(0).controls.quantity.value;
// @ts-expect-error title is not nullable
form.controls.title.setValue(null);
// @ts-expect-error title is text
form.controls.title.setValue(42);
// @ts-expect-error nested start is not nullable
form.controls.schedule.controls.start.setValue(null);
// @ts-expect-error nested start is numeric
form.controls.schedule.controls.start.setValue('tomorrow');
// @ts-expect-error nested end is not nullable
form.controls.schedule.controls.end.setValue(null);
// @ts-expect-error nested end is numeric
form.controls.schedule.controls.end.setValue('tomorrow');
// @ts-expect-error row id is not nullable
form.controls.rows.at(0).controls.id.setValue(null);
// @ts-expect-error row id is text
form.controls.rows.at(0).controls.id.setValue(42);
// @ts-expect-error row code is not nullable
form.controls.rows.at(0).controls.code.setValue(null);
// @ts-expect-error row code is text
form.controls.rows.at(0).controls.code.setValue(42);
// @ts-expect-error quantity is not nullable
form.controls.rows.at(0).controls.quantity.setValue(null);
// @ts-expect-error quantity is numeric
form.controls.rows.at(0).controls.quantity.setValue('2');
// @ts-expect-error row id is required
const bad:EditorInput={title:'abc',schedule:{start:1,end:2},rows:[{code:'X',quantity:1}]};
void title;void start;void end;void id;void code;void quantity;void bad;`;
  const options = { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, allowImportingTsExtensions: true, types: [] };
  const host = ts.createCompilerHost(options), original = host.getSourceFile;
  host.getSourceFile = (path, language, ...rest) => path === file ? ts.createSourceFile(path, source, language, true) : original.call(host, path, language, ...rest);
  const errors = ts.getPreEmitDiagnostics(ts.createProgram([context.solutionFile, file], options, host));
  assert.equal(errors.length, 0, errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
}

async function rowsForm() {
  const { FormArray, FormGroup, FormControl } = await import('@angular/forms');
  return new FormArray(['a', 'b'].map(id => new FormGroup({ id: new FormControl(id), label: new FormControl(id.toUpperCase()) })));
}
const snapshot = () => ({ revision: 7, rows: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] });
const response = (errors, revision = 7) => ({ revision, errors });
const actor = (roles, id = 'u', active = true) => ({ id, roles, active });
export const permissionReference = (user, issue) => Boolean(user?.active && issue.status !== 'DONE' && (user.roles.includes('ADMIN') || user.roles.includes('EDITOR') && user.id === issue.ownerId));
export const permissionMutants = [
  () => true,
  (user, issue) => Boolean(user && issue.status !== 'DONE' && (user.roles.includes('ADMIN') || user.roles.includes('EDITOR') && user.id === issue.ownerId)),
  (user, issue) => Boolean(user?.active && (user.roles.includes('ADMIN') || user.roles.includes('EDITOR') && user.id === issue.ownerId)),
  (user, issue) => Boolean(user.active && issue.status !== 'DONE' && (user.roles.includes('ADMIN') || user.roles.includes('EDITOR') && user.id === issue.ownerId)),
  (user, issue) => Boolean(user?.active && issue.status !== 'DONE' && (user.roles.includes('ADMIN') || user.roles.includes('EDITOR'))),
  (user, issue) => Boolean(user?.active && issue.status !== 'DONE' && user.id === issue.ownerId),
  (user, issue) => Boolean(user?.active && issue.status !== 'DONE' && user.roles.includes('EDITOR') && user.id === issue.ownerId),
  (user, issue) => Boolean(user?.active && issue.status !== 'DONE' && user.roles.includes('ADMIN')),
];

export const middleTargets = Object.freeze({
  'middle-01': target({
    'bounded-ordered': async s => {
      const gates = Array.from({ length: 5 }, deferred), calls = [];
      const result = s.mapConcurrent(['a', 'b', 'c', 'd', 'e'], 2, (value, index) => { calls.push([value, index]); return gates[index].promise; });
      result.catch(() => {}); await tick(); assert.deepEqual(calls, [['a', 0], ['b', 1]], 'Запускайте не больше limit работ.');
      gates[1].resolve('B'); await tick(); assert.equal(calls.length, 3);
      gates[2].resolve('C'); await tick(); assert.equal(calls.length, 4);
      gates[0].resolve('A'); await tick(); assert.equal(calls.length, 5);
      gates[4].resolve('E'); gates[3].resolve('D'); assert.deepEqual(await result, ['A', 'B', 'C', 'D', 'E']);
    },
    'failure-stops-launch': async s => {
      const gates = Array.from({ length: 4 }, deferred), calls = [], failure = new Error('offline');
      const result = s.mapConcurrent([0, 1, 2, 3], 2, (_, index) => { calls.push(index); return gates[index].promise; });
      result.catch(() => {}); await tick(); gates[0].reject(failure); await tick(); gates[1].resolve(1);
      await assert.rejects(result, error => error === failure); await tick(); assert.deepEqual(calls, [0, 1]);
      await assert.rejects(s.mapConcurrent([1], 1, () => { throw failure; }), error => error === failure);
    },
    'empty-and-limit': async s => {
      assert.deepEqual(await s.mapConcurrent([], 2, () => assert.fail('empty worker')), []);
      assert.deepEqual(await s.mapConcurrent([2, 3], 9, n => n * 2), [4, 6]);
      for (const limit of [0, -1, 1.5, NaN, Infinity]) await assert.rejects(async () => s.mapConcurrent([], limit, () => 0), RangeError);
    },
  }),
  'middle-02': target({
    'mapped-boundary': s => {
      const input = frozen([{ id: ' a ', title: ' API ', createdAt: '2024-02-29', ignored: true }]);
      assert.deepEqual(s.decodeIssues(input), { ok: true, value: [{ id: 'a', title: 'API', createdAt: new Date('2024-02-29T00:00:00.000Z') }] });
      assert.deepEqual(s.decodeIssues([]), { ok: true, value: [] });
    },
    'invalid-calendar-and-shape': s => {
      const valid = { id: 'a', title: 'A', createdAt: '2026-10-28' };
      for (const input of [null, {}, '[]', [null], [valid, {}], [{ ...valid, id: 3 }], [{ ...valid, title: ' ' }], ...['2023-02-29', '2024-02-30', '2026-13-01', '2026-00-01', '2026-1-01', '2026-10-28T00:00:00Z', 'yesterday'].map(createdAt => [{ ...valid, createdAt }])]) assert.deepEqual(s.decodeIssues(input), { ok: false, error: 'invalid-data' }, JSON.stringify(input));
    },
    'duplicates-and-fresh-dates': s => {
      const row = { id: 'a', title: 'A', createdAt: '2026-01-01' };
      assert.deepEqual(s.decodeIssues([row, { ...row, id: ' a ' }]), { ok: false, error: 'invalid-data' });
      const first = s.decodeIssues([row]), next = s.decodeIssues([row]); first.value[0].createdAt.setUTCFullYear(2000);
      assert.equal(next.value[0].createdAt.getUTCFullYear(), 2026); assert.equal(row.createdAt, '2026-01-01');
    },
  }),
  'middle-03': target({
    'signals-and-selection': async s => {
      const { isSignal } = await import('@angular/core'); const store = s.createSelectionStore(items());
      for (const key of ['items', 'selectedId', 'selected']) assert.ok(isSignal(store[key]), `${key} должен быть Angular Signal.`);
      assert.equal(store.selectedId(), null); assert.equal(store.selected(), null);
      store.select('b'); assert.equal(store.selected(), store.items()[1]); store.select('missing'); assert.equal(store.selectedId(), 'b'); store.select(null); assert.equal(store.selected(), null);
    },
    'replace-selection-invariant': s => {
      const store = s.createSelectionStore(items()); store.select('b'); const replacement = [{ id: 'b', title: 'New' }];
      store.replace(replacement); assert.equal(store.selected(), replacement[0]); store.replace([{ id: 'a', title: 'A' }]); assert.equal(store.selectedId(), null); assert.equal(store.selected(), null);
    },
    'immutable-rename-noop': s => {
      const input = frozen(items()), store = s.createSelectionStore(input); store.select('a'); store.rename('a', 'Changed');
      assert.equal(input[0].title, 'Alpha'); assert.notEqual(store.items(), input); assert.equal(store.items()[1], input[1]); assert.equal(store.selected().title, 'Changed');
      const before = store.items(); store.rename('missing', 'X'); assert.equal(store.items(), before); store.rename('a', 'Changed'); assert.equal(store.items(), before);
    },
  }),
  'middle-04': target({
    'validated-multifilters': s => {
      assert.deepEqual(s.readRoute('https://app.test/issues?q=%20A%26B%20&status=DONE&status=OPEN&status=DONE&status=bad&page=12&pageSize=50&sort=title'), { q: 'A&B', statuses: ['OPEN', 'DONE'], page: 12, pageSize: 50, sort: 'title' });
      for (const page of ['-1', '2x', '1.5', '1e2', ' 2 ', '9007199254740992']) assert.deepEqual(s.readRoute(`https://app.test/?page=${encodeURIComponent(page)}&pageSize=11&sort=bad`), filters);
      for (const size of ['1e1', '10.0', ' 50 ', '+25']) assert.equal(s.readRoute(`https://app.test/?pageSize=${encodeURIComponent(size)}`).pageSize, 25);
      assert.equal(s.readRoute('https://app.test/?page=2&page=7&q=first&q=second').page, 2);
    },
    'roundtrip-and-preservation': s => {
      const value = { q: ' тест & + ', statuses: ['DONE', 'OPEN', 'DONE'], page: 3, pageSize: 10, sort: 'title' };
      const output = s.writeRoute('https://app.test/issues?tag=a&tag=b&status=bad&page=9&q=old#row-7', value), url = new URL(output);
      assert.deepEqual(s.readRoute(output), { ...value, q: 'тест & +', statuses: ['OPEN', 'DONE'] });
      assert.deepEqual(url.searchParams.getAll('tag'), ['a', 'b']); assert.equal(url.hash, '#row-7'); assert.equal(url.pathname, '/issues'); assert.equal(url.origin, 'https://app.test');
      assert.equal(url.searchParams.getAll('q').length, 1); assert.equal(url.searchParams.getAll('page').length, 1);
    },
    'canonical-defaults-and-invalid-write': s => {
      const url = new URL(s.writeRoute('https://app.test/?q=x&q=y&status=DONE&page=9&pageSize=10&sort=title&keep=1', { q: ' ', statuses: ['BAD'], page: -2, pageSize: 7, sort: 'wrong' }));
      for (const name of ['q', 'status', 'page', 'pageSize', 'sort']) assert.equal(url.searchParams.has(name), false, name);
      assert.equal(url.searchParams.get('keep'), '1'); assert.deepEqual(s.readRoute(url.href), filters);
      assert.deepEqual(s.readRoute(s.writeRoute('https://app.test/', { q: 7, statuses: null, page: '2', pageSize: '50', sort: null })), filters);
    },
  }),
  'middle-05': target({
    'lazy-shared-replayed': async s => {
      const { Subject } = await import('rxjs'); const sources = [], calls = [];
      const cache = s.createReadCache(key => { calls.push(key); const subject = new Subject(); sources.push(subject); return subject; });
      const a = [], b = [], read = cache.read('a'); assert.equal(calls.length, 0);
      const one = read.subscribe(value => a.push(value)), two = cache.read('a').subscribe(value => b.push(value)); assert.deepEqual(calls, ['a']);
      sources[0].next(7); sources[0].complete(); assert.deepEqual(a, [7]); assert.deepEqual(b, [7]);
      const replay = []; cache.read('a').subscribe(value => replay.push(value)); assert.deepEqual(replay, [7]); assert.equal(calls.length, 1); one.unsubscribe(); two.unsubscribe();
      cache.invalidate('a'); const reloaded = cache.read('a').subscribe(); assert.deepEqual(calls, ['a', 'a']); reloaded.unsubscribe();
      const other = cache.read('b').subscribe(); assert.deepEqual(calls, ['a', 'a', 'b']); other.unsubscribe();
    },
    'errors-and-invalidation': async s => {
      const { Subject, throwError } = await import('rxjs'); const sources = [];
      const cache = s.createReadCache(() => { const source = new Subject(); sources.push(source); return source; });
      let error; cache.read('a').subscribe({ error: e => { error = e; } }); sources[0].error('bad'); assert.equal(error, 'bad');
      const old = []; cache.read('a').subscribe(value => old.push(value)); assert.equal(sources.length, 2); cache.invalidate('a');
      const fresh = []; cache.read('a').subscribe(value => fresh.push(value)); assert.equal(sources.length, 3);
      sources[1].next('old'); sources[1].complete(); sources[2].next('new'); sources[2].complete();
      assert.deepEqual(old, ['old']); assert.deepEqual(fresh, ['new']); const replay = []; cache.read('a').subscribe(v => replay.push(v)); assert.deepEqual(replay, ['new']);
      let calls = 0; const throwing = s.createReadCache(() => { calls++; throw new Error('sync'); });
      throwing.read('a').subscribe({ error: () => {} }); throwing.read('a').subscribe({ error: () => {} }); assert.equal(calls, 2);
      let loads = 0, retry; const second = new Subject();
      const reentrant = s.createReadCache(() => ++loads === 1 ? throwError(() => new Error('first')) : second);
      reentrant.read('a').subscribe({ error: () => { retry = reentrant.read('a').subscribe(); } });
      const another = reentrant.read('a').subscribe(); assert.equal(loads, 2, 'Повтор из error handler должен разделять новую запись кеша.'); retry.unsubscribe(); another.unsubscribe();
      const generations = [], oldErrors = [], freshValues = [], sharedValues = [];
      const isolated = s.createReadCache(() => { const source = new Subject(); generations.push(source); return source; });
      const oldRequest = isolated.read('a').subscribe({ error: error => oldErrors.push(error) });
      isolated.invalidate('a');
      const freshRequest = isolated.read('a').subscribe(value => freshValues.push(value));
      const oldError = new Error('old generation failed'); generations[0].error(oldError);
      const sharedRequest = isolated.read('a').subscribe(value => sharedValues.push(value));
      try {
        assert.equal(generations.length, 2, 'Ошибка старого поколения не должна удалять новую запись кеша.');
        assert.deepEqual(oldErrors, [oldError]); generations[1].next('fresh'); generations[1].complete();
        assert.deepEqual(freshValues, ['fresh']); assert.deepEqual(sharedValues, ['fresh']);
      } finally { oldRequest.unsubscribe(); freshRequest.unsubscribe(); sharedRequest.unsubscribe(); }
    },
    'last-unsubscribe-cancels': async s => {
      const { Observable } = await import('rxjs'); let starts = 0, stops = 0;
      const cache = s.createReadCache(() => new Observable(() => { starts++; return () => { stops++; }; }));
      const a = cache.read('x').subscribe(), b = cache.read('x').subscribe(); assert.equal(starts, 1); a.unsubscribe(); assert.equal(stops, 0); b.unsubscribe(); assert.equal(stops, 1);
      const c = cache.read('x').subscribe(); assert.equal(starts, 2); c.unsubscribe(); assert.equal(stops, 2);
      let generations = 0; const stopped = [];
      const isolated = s.createReadCache(() => new Observable(() => { const generation = generations++; return () => stopped.push(generation); }));
      const oldRequest = isolated.read('x').subscribe(); isolated.invalidate('x');
      const freshRequest = isolated.read('x').subscribe(); oldRequest.unsubscribe();
      const sharedRequest = isolated.read('x').subscribe();
      try {
        assert.equal(generations, 2, 'Отмена старого поколения не должна удалять новую запись кеша.');
        assert.deepEqual(stopped, [0]); freshRequest.unsubscribe(); assert.deepEqual(stopped, [0]);
        sharedRequest.unsubscribe(); assert.deepEqual(stopped, [0, 1]);
      } finally { oldRequest.unsubscribe(); freshRequest.unsubscribe(); sharedRequest.unsubscribe(); }
    },
  }),
  'middle-06': target({
    'serial-order-and-recovery': async s => {
      const { Subject } = await import('rxjs'); const commands = new Subject(), sources = [], calls = [], output = [], errors = [];
      s.serializeWrites(commands, command => { calls.push(command.id); const subject = new Subject(); sources.push(subject); return subject; }).subscribe({ next: value => output.push(value), error: error => errors.push(error) });
      commands.next({ id: 'a' }); commands.next({ id: 'b' }); commands.next({ id: 'c' }); commands.complete(); assert.deepEqual(calls, ['a']);
      sources[0].next('A'); sources[0].complete(); assert.deepEqual(calls, ['a', 'b']); sources[1].error(new Error('private detail')); assert.deepEqual(calls, ['a', 'b', 'c']); sources[2].next('C'); sources[2].complete();
      assert.deepEqual(output, [{ id: 'a', ok: true, value: 'A' }, { id: 'b', ok: false, error: 'save-failed' }, { id: 'c', ok: true, value: 'C' }]);
      assert.deepEqual(errors, [], 'Ошибка отдельной записи не должна завершать очередь.');
    },
    'synchronous-error-and-lazy': async s => {
      const { of } = await import('rxjs'); const calls = [], output = [], errors = [];
      const stream = s.serializeWrites(of({ id: 'a' }, { id: 'b' }), command => { calls.push(command.id); if (command.id === 'a') throw Error('sync'); return of(2); });
      assert.deepEqual(calls, []); stream.subscribe({ next: value => output.push(value), error: error => errors.push(error) }); assert.deepEqual(output, [{ id: 'a', ok: false, error: 'save-failed' }, { id: 'b', ok: true, value: 2 }]); assert.deepEqual(errors, []);
    },
    'unsubscribe-discards-queue': async s => {
      const { Subject, Observable } = await import('rxjs'); const commands = new Subject(), calls = []; let stops = 0;
      const subscription = s.serializeWrites(commands, command => new Observable(() => { calls.push(command.id); return () => { stops++; }; })).subscribe();
      commands.next({ id: 'a' }); commands.next({ id: 'b' }); subscription.unsubscribe(); commands.next({ id: 'c' }); assert.deepEqual(calls, ['a']); assert.equal(stops, 1); assert.equal(commands.observers.length, 0);
    },
  }),
  'middle-07': target({
    'nested-form-and-fields': async s => {
      const { FormGroup, FormArray } = await import('@angular/forms'); const input = frozen(editorInput()), form = s.createEditor(input);
      assert.ok(form instanceof FormGroup); assert.ok(form.controls.schedule instanceof FormGroup); assert.ok(form.controls.rows instanceof FormArray); assert.deepEqual(form.getRawValue(), input); assert.equal(form.valid, true);
      form.controls.title.setValue(''); assert.ok(form.controls.title.hasError('required')); form.controls.title.setValue('ab'); assert.ok(form.controls.title.hasError('minlength'));
      form.controls.rows.at(0).controls.code.setValue(''); assert.ok(form.controls.rows.at(0).controls.code.hasError('required'));
      form.controls.rows.at(1).controls.quantity.setValue(0); assert.ok(form.controls.rows.at(1).controls.quantity.hasError('min'));
      form.controls.schedule.patchValue({ start: 10, end: 20 });
      form.controls.rows.at(0).controls.id.setValue('changed');
      form.reset(); assert.deepEqual(form.getRawValue(), input, 'nonNullable controls после reset() возвращают исходные значения.'); assert.equal(form.valid, true);
    },
    'cross-fields-and-dynamic-rows': s => {
      const form = s.createEditor(editorInput()), schedule = form.controls.schedule, rows = form.controls.rows;
      schedule.controls.end.setValue(2); assert.equal(schedule.hasError('order'), true); schedule.controls.start.setValue(0); assert.equal(schedule.hasError('order'), false);
      rows.at(1).controls.code.setValue(' api '); assert.equal(rows.hasError('duplicateCode'), true); rows.removeAt(0); assert.equal(rows.hasError('duplicateCode'), false);
      rows.at(0).controls.code.setValue(''); assert.equal(rows.hasError('duplicateCode'), false);
    },
    'strict-form-types': (_s, context) => formTypes(context),
  }, 'solution.ts'),
  'middle-08': target({
    'stable-id-and-local-errors': async s => {
      const rows = await rowsForm(), first = rows.at(0); rows.removeAt(0); rows.push(first); first.controls.label.setErrors({ custom: true });
      const result = s.applyRowErrors(rows, response([{ id: 'a', field: 'label', message: 'Занято' }]), snapshot(), 7);
      assert.equal(result, 1); assert.deepEqual(first.controls.label.errors, { custom: true, server: 'Занято' }); assert.equal(rows.at(0).controls.label.errors, null); assert.equal(first.controls.label.value, 'A');
    },
    'preserve-new-input-and-stale-revision': async s => {
      const rows = await rowsForm(); rows.at(0).controls.label.setValue('New'); const error = [{ id: 'a', field: 'label', message: 'Old' }, { id: 'b', field: 'label', message: 'B error' }];
      assert.equal(s.applyRowErrors(rows, response(error), snapshot(), 8), 0); assert.equal(s.applyRowErrors(rows, response(error, 6), snapshot(), 7), 0);
      assert.equal(s.applyRowErrors(rows, response(error), snapshot(), 7), 1); assert.equal(rows.at(0).controls.label.errors, null); assert.deepEqual(rows.at(1).controls.label.errors, { server: 'B error' });
    },
    'removed-and-unknown-fields': async s => {
      const rows = await rowsForm(); rows.removeAt(0); const before = rows.getRawValue();
      const errors = [{ id: 'a', field: 'label', message: 'gone' }, { id: 'b', field: 'id', message: 'ignore' }, { id: 'b', field: 'label', message: ' ' }, { id: 'unknown', field: 'label', message: 'ignore' }];
      assert.equal(s.applyRowErrors(rows, response(errors), snapshot(), 7), 0); assert.deepEqual(rows.getRawValue(), before); assert.equal(rows.at(0).controls.label.errors, null);
    },
  }),
  'middle-09': target({
    'fixed-safe-messages': s => {
      const messages = { 0: 'Нет соединения', 400: 'Проверьте данные', 401: 'Войдите в систему', 403: 'Недостаточно прав', 404: 'Объект не найден', 409: 'Данные изменились; обновите экран', 429: 'Слишком много запросов', 500: 'Сервис временно недоступен', 503: 'Сервис временно недоступен', 418: 'Не удалось выполнить запрос' };
      for (const [status, message] of Object.entries(messages)) assert.equal(s.presentProblem({ status: Number(status), detail: '<img onerror=alert(1)>', title: 'secret token', type: 'javascript:alert(1)' }, 'POST').message, message);
    },
    'retry-semantics': s => {
      for (const method of ['GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'PUT', 'DELETE']) for (const status of [0, 400, 401, 403, 404, 409, 429, 500, 502, 503, 504]) {
        assert.equal(s.presentProblem({ status }, method).canRetry, ['GET', 'HEAD', 'OPTIONS'].includes(method) && [0, 429, 502, 503, 504].includes(status), `${method} ${status}`);
      }
    },
    'unknown-problem-boundary': s => {
      for (const value of [null, undefined, '<b>error</b>', [], {}, { status: '503' }, { status: NaN }, { status: 503.5 }]) assert.deepEqual(s.presentProblem(value, 'GET'), { message: 'Не удалось выполнить запрос', canRetry: false });
      assert.equal(s.presentProblem({ status: 503 }, 'get').canRetry, false);
    },
  }),
  'middle-10': target({
    'optimistic-confirm-and-rollback': async s => {
      const { isSignal } = await import('@angular/core'); const initial = frozen({ id: 'a', title: 'Original', version: 3 }), store = s.createOptimistic(initial);
      assert.ok(isSignal(store.value)); assert.ok(isSignal(store.pending)); assert.equal(store.pending(), false);
      const token = store.begin('Draft'); assert.equal(token.expectedVersion, 3); assert.equal(token.title, 'Draft'); assert.equal(store.value().title, 'Draft'); assert.equal(store.pending(), true);
      store.resolve(token, { id: 'a', title: 'Saved', version: 4 }); assert.deepEqual(store.value(), { id: 'a', title: 'Saved', version: 4 }); assert.equal(store.pending(), false);
      const next = store.begin('Again'); assert.equal(next.expectedVersion, 4); store.reject(next); assert.deepEqual(store.value(), { id: 'a', title: 'Saved', version: 4 }); assert.equal(store.pending(), false); assert.equal(initial.title, 'Original');
    },
    'stale-settles-cannot-overwrite': s => {
      const store = s.createOptimistic({ id: 'a', title: 'Base', version: 1 }), a = store.begin('A'), b = store.begin('B'); assert.notEqual(a.requestId, b.requestId);
      store.resolve(a, { id: 'a', title: 'Old server', version: 2 }); store.reject(a); assert.equal(store.value().title, 'B'); assert.equal(store.pending(), true);
      store.resolve(b, { id: 'a', title: 'B saved', version: 3 }); store.resolve(a, { id: 'a', title: 'Late', version: 4 }); store.reject(b);
      assert.deepEqual(store.value(), { id: 'a', title: 'B saved', version: 3 }); assert.equal(store.pending(), false);
    },
    'invalid-commit-and-snapshot-isolation': s => {
      const input = { id: 'a', title: 'Base', version: 2 }, store = s.createOptimistic(input); input.title = 'external'; assert.equal(store.value().title, 'Base');
      const token = store.begin('Draft'); for (const server of [{ id: 'b', title: 'Wrong', version: 3 }, { id: 'a', title: 'Old', version: 2 }, { id: 'a', title: 'Bad', version: 2.5 }]) store.resolve(token, server);
      assert.equal(store.value().title, 'Draft'); assert.equal(store.pending(), true);
      const server = { id: 'a', title: 'Good', version: 3 }; store.resolve(token, server); server.title = 'external'; assert.equal(store.value().title, 'Good');
    },
  }),
  'middle-11': target({
    'accepts-correct-behavior': async s => {
      let calls = 0; await s.verifyCanEdit((user, issue) => { calls++; return permissionReference(user, issue); }); assert.ok(calls >= 1, 'Нужны вызовы переданной реализации.');
      assert.equal(permissionReference(actor(['EDITOR']), { ownerId: 'u', status: 'OPEN' }), true);
    },
    'rejects-access-mutants': async s => {
      for (const mutant of permissionMutants.slice(0, 4)) await assert.rejects(async () => s.verifyCanEdit(mutant), 'Проверьте ограничения доступа, включая null actor.');
    },
    'rejects-role-and-ownership-mutants': async s => {
      for (const mutant of permissionMutants.slice(4)) await assert.rejects(async () => s.verifyCanEdit(mutant), 'Проверьте роль, владельца, ADMIN и разрешённое редактирование EDITOR.');
    },
  }),
  'middle-12': target({
    'visible-window-and-overscan': s => {
      assert.deepEqual(s.virtualWindow({ count: 100, rowHeight: 20, scrollTop: 45, viewportHeight: 50, overscan: 1 }), { start: 1, end: 6, offset: 20, totalHeight: 2000 });
      assert.deepEqual(s.virtualWindow({ count: 100, rowHeight: 20, scrollTop: 40, viewportHeight: 40, overscan: 0 }), { start: 2, end: 4, offset: 40, totalHeight: 2000 });
    },
    'clamped-and-empty': s => {
      assert.deepEqual(s.virtualWindow({ count: 5, rowHeight: 20, scrollTop: 999, viewportHeight: 50, overscan: 2 }), { start: 0, end: 5, offset: 0, totalHeight: 100 });
      assert.deepEqual(s.virtualWindow({ count: 2, rowHeight: 20, scrollTop: 30, viewportHeight: 100, overscan: 0 }), { start: 0, end: 2, offset: 0, totalHeight: 40 });
      for (const [count, viewportHeight] of [[0, 100], [100, 0]]) assert.deepEqual(s.virtualWindow({ count, rowHeight: 10, scrollTop: 50, viewportHeight, overscan: 4 }), { start: 0, end: 0, offset: 0, totalHeight: count * 10 });
    },
    'validated-input-and-new-sizes': s => {
      const valid = { count: 12, rowHeight: 12.5, scrollTop: 13, viewportHeight: 13, overscan: 0 };
      assert.deepEqual(s.virtualWindow(valid), { start: 1, end: 3, offset: 12.5, totalHeight: 150 });
      for (const [key, value] of [['count', -1], ['count', 1.5], ['overscan', -1], ['overscan', 1.5], ['rowHeight', 0], ['rowHeight', NaN], ['scrollTop', -1], ['scrollTop', Infinity], ['viewportHeight', -1], ['viewportHeight', NaN]]) assert.throws(() => s.virtualWindow({ ...valid, [key]: value }), RangeError, key);
    },
  }),
});
