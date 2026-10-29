import assert from 'node:assert/strict';
import { basename, dirname, join } from 'node:path';

const frozen = value => { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); } return value; };
const records = () => [{ id: 'Q-7', title: 'Поиск', status: 'OPEN' }, { id: 'Q-9', title: 'Форма', status: 'DONE' }, { id: 'X-2', title: 'API', status: 'OPEN' }];
const target = (checks, solutionFile = 'solution.mjs') => Object.freeze({ solutionFile, checks: Object.freeze(checks) });

async function types(context, contract) {
  assert.ok(context?.solutionFile, 'Проверке типов нужен путь solution.ts.');
  const ts = (await import('typescript')).default;
  const fixture = join(dirname(context.solutionFile), '.assessment-types.ts').replaceAll('\\', '/');
  contract = contract.replaceAll('./solution.ts', `./${basename(context.solutionFile)}`);
  const options = { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, allowImportingTsExtensions: true, types: [] };
  const host = ts.createCompilerHost(options), original = host.getSourceFile;
  host.getSourceFile = (file, language, ...rest) => file === fixture ? ts.createSourceFile(file, contract, language, true) : original.call(host, file, language, ...rest);
  const program = ts.createProgram([context.solutionFile, fixture], options, host);
  const errors = ts.getPreEmitDiagnostics(program);
  assert.equal(errors.length, 0, errors.map(error => `${error.file?.fileName ?? ''}: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`).join('\n'));
}

async function marble(run) {
  const { TestScheduler } = await import('rxjs/testing');
  new TestScheduler((actual, expected) => assert.deepEqual(actual, expected)).run(run);
}

export const checkTargets = Object.freeze({
  'checks-01': target({
    'one-record': s => { const data = records(); data[1].owner = { id: 'u2' }; const result = s.updateStatus(data, 'Q-9', 'OPEN'); assert.deepEqual(result, [data[0], { ...data[1], status: 'OPEN' }, data[2]]); assert.notEqual(result, data); assert.equal(result[1].owner, data[1].owner); },
    'structural-sharing': s => { const data = frozen(records()); const result = s.updateStatus(data, 'Q-7', 'DONE'); assert.notEqual(result[0], data[0]); assert.equal(result[1], data[1]); assert.equal(data[0].status, 'OPEN'); },
    'no-op': s => { const data = records(); assert.equal(s.updateStatus(data, 'missing', 'DONE'), data); assert.equal(s.updateStatus(data, 'Q-9', 'DONE'), data); const empty = []; assert.equal(s.updateStatus(empty, 'Q-1', 'DONE'), empty); },
  }),
  'checks-02': target({
    'valid-page': s => { const page = { items: records(), total: 8, trace: 'keep' }; page.items[0].title = ' Поиск '; page.items[0].priority = 'LOW'; assert.deepEqual(s.parseIssuePage(JSON.stringify(page)), { ok: true, value: page }); assert.deepEqual(s.parseIssuePage('{"items":[],"total":0}'), { ok: true, value: { items: [], total: 0 } }); },
    'bad-json': s => { for (const value of ['{', '', 'undefined', '[1,]']) assert.deepEqual(s.parseIssuePage(value), { ok: false, error: 'invalid-json' }); },
    'runtime-shape': s => { for (const value of [null, [], {}, { items: null, total: 0 }, { items: [], total: '3' }, { items: [], total: -1 }, { items: [], total: 1.5 }, { items: [], total: Number.MAX_SAFE_INTEGER + 1 }, { items: [records()[0], null], total: 2 }, { items: [[], records()[0]], total: 2 }, { items: [{ id: 1, title: 'x', status: 'OPEN' }], total: 1 }, { items: [{ id: '', title: 'x', status: 'OPEN' }], total: 1 }, { items: [{ id: 'x', title: ' ', status: 'OPEN' }], total: 1 }, { items: [{ id: 'x', title: 'x', status: 'closed' }], total: 1 }, { items: records(), total: 1 }]) assert.deepEqual(s.parseIssuePage(JSON.stringify(value)), { ok: false, error: 'invalid-shape' }, JSON.stringify(value)); },
  }),
  'checks-03': target({
    'all-variants': s => { assert.equal(s.describeLoad({ kind: 'idle' }), 'Не загружено'); assert.equal(s.describeLoad({ kind: 'loading' }), 'Загрузка'); assert.equal(s.describeLoad({ kind: 'ready', items: records() }), 'Заявок: 3'); assert.equal(s.describeLoad({ kind: 'ready', items: [] }), 'Заявок: 0'); assert.equal(s.describeLoad({ kind: 'error', message: 'Нет сети' }), 'Ошибка: Нет сети'); },
    'union-types': (_s, context) => types(context, `import { describeLoad, type LoadState } from './solution.ts';\nconst state: LoadState = {kind:'ready',items:[{id:'a',title:'A',status:'OPEN'}]};\nconst label: string = describeLoad(state);\n// @ts-expect-error ready requires items\ndescribeLoad({kind:'ready'});\n// @ts-expect-error unknown discriminant\ndescribeLoad({kind:'done'});\n// @ts-expect-error result is text\nconst bad: number = describeLoad({kind:'idle'});\nvoid label; void bad;`),
  }, 'solution.ts'),
  'checks-04': target({
    mapping: s => { const page = frozen({ items: [{ id: 17 }, { id: 2 }], page: 3, total: 41 }); const calls = []; const result = s.mapPage(page, item => { calls.push(item.id); return `#${item.id}`; }); assert.deepEqual(result, { items: ['#17', '#2'], page: 3, total: 41 }); assert.deepEqual(calls, [17, 2]); assert.notEqual(result, page); },
    'empty-page': s => assert.deepEqual(s.mapPage({ items: [], page: 4, total: 100 }, () => { throw Error('empty callback'); }), { items: [], page: 4, total: 100 }),
    'generic-types': (_s, context) => types(context, `import { mapPage, type Page } from './solution.ts';\nconst input: Page<{id:string}> = {items:[{id:'a'}],page:0,total:1};\nconst output = mapPage(input, row => row.id.length);\nconst numberValue: number = output.items[0];\nconst stringValue: string = mapPage({items:[2],page:0,total:1}, n => String(n)).items[0];\n// @ts-expect-error generic output is number\nconst wrong: string = output.items[0];\n// @ts-expect-error callback receives the item type\nmapPage(input, (n: number) => n + 1);\nvoid numberValue; void stringValue; void wrong;`),
  }, 'solution.ts'),
  'checks-05': target({
    'changed-fields': s => { const before = frozen({ title: 'Старая', priority: 'LOW', assignee: 'ivan' }); assert.deepEqual(s.buildPatch(before, { title: ' Новая ', priority: 'HIGH', assignee: null }), { title: 'Новая', priority: 'HIGH', assignee: null }); assert.deepEqual(s.buildPatch(before, { ...before, priority: 'HIGH' }), { priority: 'HIGH' }); },
    'empty-patch': s => { const before = frozen({ title: 'Название', priority: 'HIGH', assignee: null }); assert.deepEqual(s.buildPatch(before, { ...before, title: '  Название  ' }), {}); },
    'patch-types': (_s, context) => types(context, `import { buildPatch, type IssueDraft, type IssuePatch } from './solution.ts';\nconst draft: IssueDraft = {title:'X',priority:'LOW',assignee:null};\nconst patch: IssuePatch = buildPatch(draft,draft);\nconst title: string | undefined = patch.title;\n// @ts-expect-error priority is closed\nbuildPatch(draft,{...draft,priority:'URGENT'});\n// @ts-expect-error patch cannot change id\nconst wrong: IssuePatch = {id:'x'};\n// @ts-expect-error title remains optional\nconst required: string = patch.title;\nvoid title; void wrong; void required;`),
  }, 'solution.ts'),
  'checks-06': target({
    parsing: s => {
      assert.deepEqual(s.readFilters('https://example.test/issues?q=%20Angular%20&status=DONE&page=12'), { q: 'Angular', status: 'DONE', page: 12 });
      for (const page of ['-1','1.5','4x','Infinity','9007199254740992','1e2','+2','1.0',' 2 ','\t7\n',' ']) {
        assert.deepEqual(s.readFilters(`https://example.test/issues?page=${encodeURIComponent(page)}&status=OTHER`), { q: '', status: 'ALL', page: 0 }, `Invalid page ${JSON.stringify(page)}`);
      }
      assert.equal(s.readFilters('https://example.test/?q=A%26B%2B').q, 'A&B+');
    },
    restoration: s => { const state = { q: 'тест & API', status: 'IN_PROGRESS', page: 7 }; const output = s.writeFilters('https://example.test/issues?sort=title&q=old#list', state); assert.deepEqual(s.readFilters(output), state); const url = new URL(output); assert.equal(url.searchParams.get('sort'), 'title'); assert.equal(url.hash, '#list'); assert.equal(url.pathname, '/issues'); },
    'clear-defaults': s => { const url = new URL(s.writeFilters('https://example.test/issues?q=x&status=OPEN&page=2&sort=id', { q: ' ', status: 'ALL', page: 0 })); for (const key of ['q','status','page']) assert.equal(url.searchParams.has(key), false); assert.equal(url.searchParams.get('sort'), 'id'); },
  }),
  'checks-07': target({
    'actual-signals': async s => { const { isSignal } = await import('@angular/core'); const store = s.createIssueStore(records()); for (const key of ['issues','query','visible','openCount']) assert.ok(isSignal(store[key]), `${key} должен быть настоящим Angular Signal`); assert.equal(store.openCount(), 2); },
    'derived-updates': s => { const data = frozen(records()); const store = s.createIssueStore(data); store.query.set('  фОРМа '); assert.deepEqual(store.visible(), [data[1]]); store.query.set(''); store.replaceStatus('Q-7', 'DONE'); assert.equal(store.openCount(), 1); assert.equal(store.issues()[0].status, 'DONE'); assert.equal(data[0].status, 'OPEN'); store.issues.set([{ id: 'N', title: 'Новая', status: 'OPEN' }]); assert.equal(store.openCount(), 1); assert.equal(store.visible()[0].id, 'N'); },
    'stable-computed': s => { const store = s.createIssueStore(records()); const first = store.visible(); assert.equal(store.visible(), first); store.query.set('missing'); assert.deepEqual(store.visible(), []); },
  }),
  'checks-08': target({
    'injection-scope': async s => {
      const { Injector, InjectionToken } = await import('@angular/core');
      assert.ok(s.ISSUE_REPOSITORY instanceof InjectionToken);
      const reader = new InjectionToken('reader');
      let calls = 0;
      const fresh = [{ id: 'fresh', title: 'Обновлённая', status: 'OPEN' }, { id: 'closed', title: 'Завершённая', status: 'DONE' }];
      const repo = { list: async () => ++calls === 1 ? records() : fresh };
      const parent = Injector.create({ providers: [{ provide: s.ISSUE_REPOSITORY, useValue: repo }, { provide: reader, useFactory: s.createIssueReader }] });
      const child = Injector.create({ parent, providers: [{ provide: s.ISSUE_REPOSITORY, useValue: { list: async () => [{ id: 'child', title: 'Локальная', status: 'OPEN' }] } }, { provide: reader, useFactory: s.createIssueReader }] });
      const instance = parent.get(reader);
      assert.deepEqual(await instance.listOpen(), [records()[0], records()[2]]);
      assert.equal(calls, 1);
      const second = await instance.listOpen();
      assert.equal(calls, 2, 'Каждый listOpen должен заново вызывать repository.list().');
      assert.deepEqual(second, [fresh[0]], 'Повторный вызов должен фильтровать свежие данные.');
      assert.equal(parent.get(reader), instance);
      assert.deepEqual((await child.get(reader).listOpen()).map(item => item.id), ['child']);
    },
    'dependency-failure': async s => { const { Injector, InjectionToken } = await import('@angular/core'); const reader = new InjectionToken('reader'); const injector = Injector.create({ providers: [{ provide: s.ISSUE_REPOSITORY, useValue: { list: async () => { throw Error('offline'); } } }, { provide: reader, useFactory: s.createIssueReader }] }); await assert.rejects(injector.get(reader).listOpen(), /offline/); assert.throws(() => s.createIssueReader(), /inject|0203|injection/i); },
  }),
  'checks-09': target({
    'real-form': async s => { await import('@angular/compiler'); const { FormGroup } = await import('@angular/forms'); const form = s.createIssueForm(); assert.ok(form instanceof FormGroup); assert.equal(form.invalid, true); form.controls.title.setValue('Работа'); assert.equal(form.valid, true); assert.deepEqual(form.getRawValue(), { title: 'Работа', priority: 'NORMAL', assignee: null }); },
    validation: s => { const form = s.createIssueForm(); for (const title of ['','  ',' x ', 'x'.repeat(81)]) { form.controls.title.setValue(title); assert.equal(form.controls.title.invalid, true, `title ${title}`); } for (const title of ['  abc  ', 'x'.repeat(80)]) { form.controls.title.setValue(title); assert.equal(form.controls.title.valid, true); assert.equal(form.controls.title.value, title); } form.controls.priority.setValue('OTHER'); assert.equal(form.invalid, true); form.controls.priority.setValue('HIGH'); assert.equal(form.valid, true); },
    'initial-value-reset': s => { const form = s.createIssueForm({ title: 'Существующая', priority: 'LOW', assignee: 'anna' }); form.controls.title.setValue('Другая'); form.reset(); assert.deepEqual(form.getRawValue(), { title: 'Существующая', priority: 'LOW', assignee: null }); },
  }),
  'checks-10': target({
    'server-errors': async s => { await import('@angular/compiler'); const { FormGroup, FormControl } = await import('@angular/forms'); const form = new FormGroup({ title: new FormControl('Ввод'), assignee: new FormControl('user') }); const title = form.controls.title; title.markAsDirty(); title.markAsTouched(); title.setErrors({ minlength: { requiredLength: 3, actualLength: 2 } }); const before = form.getRawValue(), messages = ['Занято', 'Выберите другое']; assert.equal(s.applyServerErrors(form, { title: messages, assignee: ['Нет пользователя'] }), undefined); messages.push('Поздняя мутация'); assert.deepEqual(title.errors, { minlength: { requiredLength: 3, actualLength: 2 }, server: ['Занято', 'Выберите другое'] }); assert.deepEqual(form.controls.assignee.errors, { server: ['Нет пользователя'] }); assert.deepEqual(form.getRawValue(), before); assert.equal(form.invalid, true); s.applyServerErrors(form, { title: ['Второй ответ'] }); assert.deepEqual(title.errors.server, ['Второй ответ']); assert.ok(title.errors.minlength); assert.equal(form.controls.title, title); assert.equal(title.dirty, true); assert.equal(title.touched, true); },
    'unknown-fields': async s => { const { FormGroup, FormControl } = await import('@angular/forms'); const form = new FormGroup({ title: new FormControl('Ввод') }); s.applyServerErrors(form, { unknown: ['X'], title: [] }); assert.equal(form.valid, true); assert.deepEqual(form.getRawValue(), { title: 'Ввод' }); },
  }),
  'checks-11': target({
    'latest-wins': s => marble(({ cold, expectObservable, expectSubscriptions }) => { const old = cold('------a|', { a: ['old'] }), latest = cold('-b|', { b: ['new'] }); const queries = cold('a 39ms b 80ms |', { a: 'old', b: 'new' }); const result = s.searchIssues(queries, query => query === 'old' ? old : latest); expectObservable(result).toBe('30ms x 5ms y 33ms z 0ms w 49ms |', { x: {kind:'loading',query:'old'}, y: {kind:'ready',query:'old',items:['old']}, z: {kind:'loading',query:'new'}, w: {kind:'ready',query:'new',items:['new']} }); expectSubscriptions(old.subscriptions).toBe('30ms ^------!'); expectSubscriptions(latest.subscriptions).toBe('70ms ^-!'); }),
    'cancel-stale': s => marble(({ cold, expectObservable, expectSubscriptions }) => { const old = cold('100ms a|', {a:['old']}), latest = cold('5ms b|',{b:['new']}); const queries = cold('a 39ms b 80ms |',{a:'old',b:'new'}); const result = s.searchIssues(queries, query => query === 'old' ? old : latest); expectObservable(result).toBe('30ms x 39ms y 4ms z 45ms |',{x:{kind:'loading',query:'old'},y:{kind:'loading',query:'new'},z:{kind:'ready',query:'new',items:['new']}}); expectSubscriptions(old.subscriptions).toBe('30ms ^ 39ms !'); }),
    'trim-debounce-distinct': s => marble(({ cold, flush }) => { const calls = []; const values = []; s.searchIssues(cold('a 5ms b 40ms c 40ms d 40ms |', {a:'a',b:' api ',c:'api',d:'   '}), query => { calls.push(query); return cold('(x|)',{x:[query]}); }).subscribe(value=>values.push(value)); flush(); assert.deepEqual(calls,['api']); assert.deepEqual(values.at(-1),{kind:'ready',query:'',items:[]}); }),
  }),
  'checks-12': target({
    'error-then-retry': s => marble(({ cold, expectObservable }) => { let call=0; const result=s.loadIssueState(cold('a---a---|',{a:'X'}),()=> ++call===1?cold('-#',{},Error('offline')):cold('-x|',{x:{id:'X'}})); expectObservable(result).toBe('le--lr--|',{l:{kind:'loading',id:'X'},e:{kind:'error',id:'X',message:'offline'},r:{kind:'ready',id:'X',issue:{id:'X'}}}); }),
    'latest-detail': s => marble(({ cold, expectObservable, expectSubscriptions }) => { const old=cold('-----x|',{x:{id:'A'}}), fresh=cold('-x|',{x:{id:'B'}}); const result=s.loadIssueState(cold('a-b----|',{a:'A',b:'B'}),id=>id==='A'?old:fresh); expectObservable(result).toBe('a-bc---|',{a:{kind:'loading',id:'A'},b:{kind:'loading',id:'B'},c:{kind:'ready',id:'B',issue:{id:'B'}}}); expectSubscriptions(old.subscriptions).toBe('^-!'); }),
  }),
  'checks-13': target({
    'destroy-unsubscribes': async s => { const { createEnvironmentInjector, DestroyRef } = await import('@angular/core'); const { Observable }=await import('rxjs'); const injector=createEnvironmentInjector([]); let observer, teardown=0; const values=[]; const source=new Observable(subscriber=>{observer=subscriber;return()=>teardown++;}); const subscription=s.watchValues(source,injector.get(DestroyRef),value=>values.push(value)); observer.next(1); injector.destroy(); observer.next(2); assert.deepEqual(values,[1]); assert.equal(teardown,1); assert.equal(subscription.closed,true); },
    'destroyed-before-subscribe': async s => { const { createEnvironmentInjector, DestroyRef } = await import('@angular/core'); const { Observable }=await import('rxjs'); const injector=createEnvironmentInjector([]), destroyRef=injector.get(DestroyRef); injector.destroy(); let subscriptions=0; const source=new Observable(()=>{subscriptions++;}); const subscription=s.watchValues(source,destroyRef,()=>assert.fail('destroyed')); assert.equal(subscriptions,0); assert.equal(subscription.closed,true); },
  }),
  'checks-14': target({
    'ignore-double-save': s => marble(({ cold, expectObservable, flush }) => { const calls=[]; const result=s.saveOnce(cold('ab---c----|',{a:{title:'A'},b:{title:'B'},c:{title:'C'}}),payload=>{calls.push(payload.title);return cold('--x|',{x:{id:payload.title}});}); expectObservable(result).toBe('--x----y--|',{x:{kind:'saved',issue:{id:'A'}},y:{kind:'saved',issue:{id:'C'}}}); flush(); assert.deepEqual(calls,['A','C']); }),
    'failure-allows-retry': s => marble(({ cold, expectObservable }) => { let calls=0; const result=s.saveOnce(cold('a---a----|',{a:{title:'A'}}),()=>++calls===1?cold('-#',{},Error('rejected')):cold('-x|',{x:{id:'A'}})); expectObservable(result).toBe('-e---s---|',{e:{kind:'error',message:'rejected'},s:{kind:'saved',issue:{id:'A'}}}); }),
  }),
  'checks-15': target({
    'parallel-order': async s => { const releases=new Map(), started=[]; const pending=s.loadDashboard(['A','B','C'],id=>{started.push(id);return new Promise(resolve=>releases.set(id,resolve));}); assert.deepEqual(started,['A','B','C'],'Начните все независимые чтения до ожидания первого.'); releases.get('C')({id:'C'}); releases.get('A')({id:'A'}); releases.get('B')({id:'B'}); assert.deepEqual(await pending,[{id:'A'},{id:'B'},{id:'C'}]); },
    'reject-and-empty': async s => { assert.deepEqual(await s.loadDashboard([],()=>assert.fail('empty')),[]); const error = Error('offline'); await assert.rejects(s.loadDashboard(['X'],async()=>{throw error;}), value => value === error); let calls = 0; assert.deepEqual(await s.loadDashboard(['A','A'],async id => ({id,call:++calls})), [{id:'A',call:1},{id:'A',call:2}]); },
  }),
  'checks-16': target({
    'deduplicate-replace': s => { const previous=frozen([{id:'A',title:'old'},{id:'B',title:'B'}]), incoming=frozen([{id:'B',title:'new'},{id:'C',title:'first'},{id:'C',title:'last'}]); assert.deepEqual(s.mergePage(previous,incoming),[{id:'A',title:'old'},{id:'B',title:'new'},{id:'C',title:'last'}]); },
    'new-page-fixtures': s => { assert.deepEqual(s.mergePage([],[{id:'__proto__',title:'safe'},{id:'constructor',title:'also'}]),[{id:'__proto__',title:'safe'},{id:'constructor',title:'also'}]); const data=frozen(records()); const copy=s.mergePage(data,[]); assert.deepEqual(copy,data); assert.notEqual(copy,data); assert.deepEqual(s.mergePage([],[]),[]); assert.deepEqual(s.mergePage([{id:'7',title:'a',owner:'u'},{id:'7',title:'second'}],[{id:'8',title:'b'},{id:'7',title:'c'}]),[{id:'7',title:'c'},{id:'8',title:'b'}]); },
  }),
});
