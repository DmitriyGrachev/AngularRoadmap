import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { dirname, basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkTargets } from './check-targets.mjs';
import { runTarget } from './targets.mjs';
import { runExercise, verifyAuthor } from './learn.mjs';
import { validateReport } from '../shared/domain.ts';

const root = resolve(import.meta.dirname, '..');
const readJson = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
const items = await readJson('content/training/checks.json');

function checkCurriculum(base) {
  const result = structuredClone(base);
  for (const item of items) {
    result.exercises = result.exercises.filter(exercise => exercise.id !== item.id);
    result.exercises.push(item.exercise);
    const lesson = result.lessons.find(lesson => lesson.id === item.lessonId);
    if (!lesson.exerciseIds.includes(item.id)) lesson.exerciseIds.push(item.id);
  }
  return result;
}

test('sixteen independently runnable exercises have complete declared checks', () => {
  assert.equal(items.length, 16);
  assert.deepEqual(items.map(item => item.id), Array.from({ length: 16 }, (_, i) => `checks-${String(i + 1).padStart(2, '0')}`));
  for (const item of items) {
    assert.equal(item.kind, 'check');
    assert.equal(item.hints.length, 3);
    assert.ok(item.brief.length > 400);
    assert.ok(item.explanation.length > 100);
    assert.deepEqual(item.exercise.requiredCheckIds, Object.keys(checkTargets[item.id].checks));
  }
});

test('all starters fail meaningful checks; all separate author solutions pass', async () => {
  const curriculum = checkCurriculum(await readJson('content/curriculum.json'));
  for (const item of items) {
    const source = join(root, item.workspacePath, checkTargets[item.id].solutionFile);
    const before = await readFile(source, 'utf8');
    const baseline = join(root, item.workspacePath, checkTargets[item.id].solutionFile.replace('solution.', 'starter.'));
    const starter = await runExercise(item.id, { curriculum, solutionPath: baseline, writeReport: false });
    assert.equal(starter.report.outcome, 'failed', `${item.id}: ${starter.detail} ${JSON.stringify(starter.report.checks)}`);
    assert.ok(starter.report.checks.some(check => check.status === 'failed'));
    assert.equal(validateReport(starter.report, curriculum).ok, true);
    const answer = await runExercise(item.id, { curriculum, solutionPath: join(root, 'author/solutions', item.id, checkTargets[item.id].solutionFile), writeReport: false });
    assert.equal(answer.report.outcome, 'passed', `${item.id}: ${answer.detail} ${JSON.stringify(answer.report.checks)}`);
    assert.equal(await readFile(source, 'utf8'), before);
  }
});

test('new examples reject hardcoded, mutating, race-prone and shape-only shortcuts', async () => {
  await import('@angular/compiler');
  const { mergeMap, map } = await import('rxjs');
  const mutants = {
    'checks-01': { updateStatus: (items, id, status) => items.map(item => ({ ...item, status })) },
    'checks-02': { parseIssuePage: text => ({ ok: true, value: JSON.parse(text) }) },
    'checks-06': { readFilters: () => ({ q: '', status: 'ALL', page: 0 }), writeFilters: url => url },
    'checks-11': { searchIssues: (queries, search) => queries.pipe(mergeMap(query => search(query).pipe(map(items => ({ kind: 'ready', query, items }))))) },
    'checks-16': { mergePage: (previous, incoming) => [...previous, ...incoming] },
  };
  for (const [id, solution] of Object.entries(mutants)) {
    assert.ok((await runTarget(id, solution)).some(check => check.status === 'failed'), `Mutant ${id} escaped`);
  }
});

test('type checker rejects a runtime-correct implementation with an erased generic contract', async () => {
  const temporary = await mkdtemp(join(root, '.checked-types-'));
  try {
    const file = join(temporary, 'solution.ts');
    await writeFile(file, 'export function mapPage(page: any, transform: any): any { return { ...page, items: page.items.map(transform) }; }');
    const solution = await import(pathToFileURL(file).href);
    const checks = await runTarget('checks-04', solution, { solutionFile: file });
    assert.equal(checks.find(check => check.id === 'generic-types').status, 'failed');
    assert.match(checks.find(check => check.id === 'generic-types').message, /Unused '@ts-expect-error'|implicitly has an 'any' type/);
    assert.equal(checks.find(check => check.id === 'mapping').status, 'passed');
  } finally {
    assert.equal(dirname(resolve(temporary)), root);
    assert.ok(basename(temporary).startsWith('.checked-types-'));
    await rm(temporary, { recursive: true, force: true });
  }
});

test('strict URL grammar and fresh DI reads reject plausible shortcuts', async () => {
  await import('@angular/compiler');
  const { InjectionToken, inject } = await import('@angular/core');
  const urlAuthor = await import('../author/solutions/checks-06/solution.mjs');
  const readerAuthor = await import('../author/solutions/checks-08/solution.mjs');
  const coercingParser = {
    ...urlAuthor,
    readFilters(url) {
      const params = new URL(url).searchParams, page = Number(params.get('page'));
      return { ...urlAuthor.readFilters(url), page: Number.isSafeInteger(page) && page >= 0 ? page : 0 };
    },
  };
  const cachedReader = eager => {
    const ISSUE_REPOSITORY = new InjectionToken('cached repository');
    return { ISSUE_REPOSITORY, createIssueReader() {
      const repository = inject(ISSUE_REPOSITORY);
      const load = () => repository.list().then(items => items.filter(item => item.status === 'OPEN'));
      let pending = eager ? load() : undefined;
      return { listOpen() { return pending ??= load(); } };
    } };
  };
  const mutants = [
    ['checks-06', 'parsing', coercingParser],
    ['checks-08', 'injection-scope', cachedReader(true)],
    ['checks-08', 'injection-scope', cachedReader(false)],
  ];
  const results = [];
  for (const [id, checkId, mutant] of mutants) {
    results.push((await runTarget(id, mutant)).find(check => check.id === checkId).status);
  }
  assert.deepEqual(results, ['failed', 'failed', 'failed'], 'Coercing parser and eager/lazy reader caches must be rejected.');
  for (const [id, author] of [['checks-06', urlAuthor], ['checks-08', readerAuthor]]) {
    assert.ok((await runTarget(id, author)).every(check => check.status === 'passed'), `Author ${id} must still pass.`);
  }
});

test('isolated author verification preserves TS, package imports, local imports and learner files', async () => {
  const curriculum = checkCurriculum(await readJson('content/curriculum.json'));
  const snapshots = await Promise.all(items.map(async item => [item.id, await readFile(join(root, item.workspacePath, checkTargets[item.id].solutionFile), 'utf8')]));
  const reports = await verifyAuthor({ curriculum });
  assert.ok(reports.length >= 17);
  assert.ok(reports.every(report => report.outcome === 'passed'));
  for (const [id, source] of snapshots) {
    assert.equal(await readFile(join(root, items.find(item => item.id === id).workspacePath, checkTargets[id].solutionFile), 'utf8'), source);
  }
});
