import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import '@angular/compiler';
import { validateCurriculum, validateReport } from '../shared/domain.ts';
import { validateTraining } from '../shared/training.ts';
import { runExercise } from './learn.mjs';
import { middleTargets } from './middle-targets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'content/training/middle.json'), 'utf8'));
// A small valid catalogue keeps this contract suite independent of unrelated lesson edits.
const curriculum = {
  schemaVersion: 1,
  lessons: manifest.map((item, index) => ({ id: item.lessonId, week: 7 + Math.floor(index / 2), order: index % 2 + 1, title: item.title, minutes: 180, contentPath: `content/lessons/${item.lessonId}.md`, prerequisites: [], readiness: 'ready', exerciseIds: [item.id] })),
  exercises: manifest.map(item => item.exercise),
};
const author = async id => import(pathToFileURL(join(root, 'author/solutions', id, middleTargets[id].solutionFile)).href);
const check = (id, name, solution) => middleTargets[id].checks[name](solution);

async function withMutantSource(id, change, inspect) {
  const source = await readFile(join(root, 'author/solutions', id, middleTargets[id].solutionFile), 'utf8');
  const mutated = change(source);
  assert.notEqual(mutated, source, 'The regression must change the author source.');
  const temporary = await mkdtemp(join(root, '.middle-mutant-'));
  try {
    const solutionFile = join(temporary, middleTargets[id].solutionFile);
    await writeFile(solutionFile, mutated);
    await inspect(await import(pathToFileURL(solutionFile).href), { solutionFile });
  } finally {
    const child = relative(root, resolve(temporary));
    assert.ok(!isAbsolute(child) && !child.startsWith('..') && child.startsWith('.middle-mutant-') && dirname(resolve(temporary)) === root);
    await rm(temporary, { recursive: true, force: true });
  }
}

test('middle manifest is a complete, bounded and linked training contract', async () => {
  assert.equal(manifest.length, 12);
  assert.equal(validateCurriculum(curriculum).ok, true);
  assert.deepEqual(validateTraining(manifest, curriculum.lessons.map(lesson => lesson.id)).errors, undefined);
  assert.deepEqual(manifest.map(item => item.id), Object.keys(middleTargets));
  for (const item of manifest) {
    const target = middleTargets[item.id];
    assert.deepEqual(item.exercise.requiredCheckIds, Object.keys(target.checks));
    assert.deepEqual(item.exercise.editablePaths, [target.solutionFile]);
    assert.equal(item.command, `npm.cmd run learn -- check ${item.id}`);
    assert.ok(item.minutes > 0 && item.minutes <= 90);
    const readme = await readFile(join(root, item.workspacePath, 'README.md'), 'utf8');
    assert.ok(readme.includes(item.command));
    assert.ok(readme.includes('Контракт API'));
  }
});

for (const item of manifest) test(`${item.id}: starter fails, author passes, learner files remain intact`, async () => {
  const target = middleTargets[item.id], learner = join(root, item.workspacePath, target.solutionFile);
  const before = await readFile(learner, 'utf8');
  const starter = join(root, item.workspacePath, target.solutionFile.replace('solution.', 'starter.'));
  const starterBefore = await readFile(starter, 'utf8');
  const failed = await runExercise(item.id, { root, curriculum, solutionPath: starter, writeReport: false });
  assert.equal(failed.report.outcome, 'failed', JSON.stringify(failed));
  assert.equal(validateReport(failed.report, curriculum).ok, true);
  assert.deepEqual(failed.report.checks.map(result => result.id), item.exercise.requiredCheckIds);
  const passed = await runExercise(item.id, { root, curriculum, solutionPath: join(root, 'author/solutions', item.id, target.solutionFile), writeReport: false });
  assert.equal(passed.report.outcome, 'passed', JSON.stringify(passed));
  assert.equal(validateReport(passed.report, curriculum).ok, true);
  assert.equal(passed.report.checks.length, item.exercise.requiredCheckIds.length);
  assert.equal(await readFile(learner, 'utf8'), before);
  assert.equal(await readFile(starter, 'utf8'), starterBefore);
});

test('middle runner writes a valid JSON report with the registered check IDs', async () => {
  const temporary = await mkdtemp(join(root, '.middle-report-'));
  try {
    const result = await runExercise('middle-12', { root: temporary, curriculum, solutionPath: join(root, 'author/solutions/middle-12/solution.mjs') });
    const report = JSON.parse(await readFile(result.reportPath, 'utf8'));
    assert.deepEqual(report, result.report);
    assert.equal(validateReport(report, curriculum).ok, true);
    assert.equal(report.outcome, 'passed');
  } finally {
    const child = relative(root, resolve(temporary));
    assert.ok(!isAbsolute(child) && !child.startsWith('..') && child.startsWith('.middle-report-') && dirname(resolve(temporary)) === root);
    await rm(temporary, { recursive: true, force: true });
  }
});

test('graders reject plausible regressions beyond each supplied starter', async () => {
  const a = {};
  for (const id of Object.keys(middleTargets)) a[id] = await author(id);
  await assert.rejects(async () => check('middle-01', 'bounded-ordered', { mapConcurrent: async (...args) => (await a['middle-01'].mapConcurrent(...args)).reverse() }));
  assert.throws(() => check('middle-02', 'duplicates-and-fresh-dates', { decodeIssues: input => a['middle-02'].decodeIssues([...new Map(input.map(row => [row.id.trim(), row])).values()]) }));
  assert.throws(() => check('middle-03', 'immutable-rename-noop', { createSelectionStore: input => {
    const store = a['middle-03'].createSelectionStore(input);
    return { ...store, rename(id, title) { store.replace(store.items().map(row => row.id === id ? { ...row, title } : row)); } };
  } }));
  assert.throws(() => check('middle-04', 'roundtrip-and-preservation', { ...a['middle-04'], writeRoute: (url, filters) => { const output = new URL(a['middle-04'].writeRoute(url, filters)); output.searchParams.delete('tag'); return output.href; } }));
  await assert.rejects(async () => check('middle-05', 'errors-and-invalidation', { createReadCache: load => ({ ...a['middle-05'].createReadCache(load), invalidate() {} }) }));
  const { concatMap, defer, map } = await import('rxjs');
  await assert.rejects(async () => check('middle-06', 'serial-order-and-recovery', { serializeWrites: (commands, save) => commands.pipe(concatMap(command => defer(() => save(command)).pipe(map(value => ({ id: command.id, ok: true, value }))))) }));
  assert.throws(() => check('middle-07', 'cross-fields-and-dynamic-rows', { createEditor: input => { const form = a['middle-07'].createEditor(input); form.controls.rows.clearValidators(); return form; } }));
  await assert.rejects(async () => check('middle-08', 'preserve-new-input-and-stale-revision', { applyRowErrors: (rows, response, snapshot, revision) => a['middle-08'].applyRowErrors(rows, { ...response, revision: snapshot.revision }, snapshot, snapshot.revision) }));
  assert.throws(() => check('middle-09', 'retry-semantics', { presentProblem: (problem, method) => ({ ...a['middle-09'].presentProblem(problem, method), canRetry: problem.status >= 500 }) }));
  assert.throws(() => check('middle-10', 'stale-settles-cannot-overwrite', { createOptimistic: input => {
    const store = a['middle-10'].createOptimistic(input); let active;
    return { ...store, begin(title) { return active = store.begin(title); }, resolve(_token, server) { store.resolve(active, server); } };
  } }));
  await assert.rejects(async () => check('middle-11', 'rejects-access-mutants', { verifyCanEdit: canEdit => { assert.equal(canEdit({ id: 'u', roles: ['ADMIN'], active: true }, { ownerId: 'v', status: 'OPEN' }), true); } }));
  assert.throws(() => check('middle-12', 'visible-window-and-overscan', { virtualWindow: input => a['middle-12'].virtualWindow({ ...input, overscan: 0 }) }));
});

test('cache grader rejects an old error deleting the new generation', async () => {
  await withMutantSource('middle-05', source => source.replace('if (entries.get(key) === stream) entries.delete(key);', 'entries.delete(key);'), async solution => {
    await assert.rejects(() => check('middle-05', 'errors-and-invalidation', solution));
  });
});

test('cache grader rejects old cancellation deleting the new generation', async () => {
  await withMutantSource('middle-05', source => source.replace('if (!complete && entries.get(key) === stream) entries.delete(key);', 'if (!complete) entries.delete(key);'), async solution => {
    await assert.rejects(() => check('middle-05', 'last-unsubscribe-cancels', solution));
  });
});

const permissionCases = [
  [{ id: 'u', roles: ['ADMIN'], active: true }, { ownerId: 'other', status: 'OPEN' }, true],
  [{ id: 'u', roles: ['ADMIN'], active: false }, { ownerId: 'u', status: 'OPEN' }, false],
  [{ id: 'u', roles: ['ADMIN'], active: true }, { ownerId: 'u', status: 'DONE' }, false],
  [{ id: 'u', roles: ['EDITOR'], active: true }, { ownerId: 'other', status: 'OPEN' }, false],
  [{ id: 'u', roles: ['VIEWER'], active: true }, { ownerId: 'u', status: 'OPEN' }, false],
];
const verifyCases = cases => canEdit => { for (const [user, issue, expected] of cases) assert.equal(canEdit(user, issue), expected); };

test('permission grader requires a null-user case', async () => {
  const verifyCanEdit = verifyCases([...permissionCases, [{ id: 'u', roles: ['EDITOR'], active: true }, { ownerId: 'u', status: 'OPEN' }, true]]);
  await assert.rejects(() => check('middle-11', 'rejects-access-mutants', { verifyCanEdit }));
});

test('permission grader requires the EDITOR-owner positive case', async () => {
  const verifyCanEdit = verifyCases([...permissionCases, [null, { ownerId: 'u', status: 'OPEN' }, false]]);
  await assert.rejects(() => check('middle-11', 'rejects-role-and-ownership-mutants', { verifyCanEdit }));
});

const nullableFormMutants = {
  id: source => source.replace('id: control(row.id)', 'id: new FormControl(row.id)'),
  code: source => source.replace('new FormControl(row.code, { nonNullable: true, validators:', 'new FormControl(row.code, { validators:').replace('row.controls.code.value.trim()', '(row.controls.code.value ?? "").trim()'),
  end: source => source.replace('end: control(input.schedule.end)', 'end: new FormControl(input.schedule.end)').replace('schedule.controls.end.value <=', '(schedule.controls.end.value ?? 0) <='),
};
for (const [field, change] of Object.entries(nullableFormMutants)) test(`form type grader rejects nullable ${field}`, async () => {
  await withMutantSource('middle-07', change, async (solution, context) => {
    await assert.rejects(() => middleTargets['middle-07'].checks['strict-form-types'](solution, context));
  });
});

test('form runtime grader rejects reset-to-null despite initial valid values', async () => {
  const solution = await author('middle-07'), { FormControl } = await import('@angular/forms');
  await assert.rejects(() => check('middle-07', 'nested-form-and-fields', { createEditor: input => {
    const form = solution.createEditor(input);
    form.controls.rows.at(0).setControl('id', new FormControl(input.rows[0].id));
    return form;
  } }));
});
