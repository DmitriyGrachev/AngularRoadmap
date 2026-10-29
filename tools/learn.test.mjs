import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { deriveOutcome, runExercise, verifyAuthor } from './learn.mjs';
import { validateReport } from '../shared/domain.ts';

const exercise = { id: 'w1-04-ex1', lessonId: 'w1-04', assessmentRevision: 1, mode: 'automated', workspacePath: 'practice/foundations/w1-04-ex1', editablePaths: ['solution.mjs'], requiredCheckIds: ['filter-open', 'immutable-input', 'empty-list', 'labels'], targetKey: 'foundations-w1-04' };
const curriculum = { schemaVersion: 1, lessons: [{ id: 'w1-04', week: 1, order: 4, title: 'Массивы', minutes: 120, contentPath: 'content/lessons/w1-04.md', prerequisites: [], readiness: 'ready', exerciseIds: [exercise.id] }], exercises: [exercise] };
const correct = 'export const filterIssues = (issues,status) => issues.filter(issue => issue.status === status); export const labelIssues = issues => issues.map(issue => `${issue.id}: ${issue.title}`);';

async function fixture(source, action) {
  const root = await mkdtemp(join(tmpdir(), 'learning-run-'));
  try {
    await mkdir(join(root, exercise.workspacePath), { recursive: true }); await writeFile(join(root, exercise.workspacePath, 'solution.mjs'), source);
    return await action(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('zero, missing and skipped required checks never pass', () => {
  assert.equal(deriveOutcome(exercise, []), 'error');
  assert.equal(deriveOutcome(exercise, [{ id: 'filter-open', status: 'passed', message: 'ok' }]), 'error');
  const complete = exercise.requiredCheckIds.map(id => ({ id, status: 'passed', message: 'ok' }));
  assert.equal(deriveOutcome(exercise, complete), 'passed'); complete[0].status = 'skipped'; assert.equal(deriveOutcome(exercise, complete), 'failed');
  assert.equal(deriveOutcome(exercise, complete, 'interrupted'), 'interrupted');
});
test('unfinished and wrong solutions fail rather than receive success', async () => {
  for (const source of ['export function filterIssues(){throw new Error("TODO: завершите упражнение")} export function labelIssues(){return []}', 'export const filterIssues = issues => issues; export const labelIssues = issues => issues;']) await fixture(source, async root => {
    const { report } = await runExercise(exercise.id, { root, curriculum }); assert.equal(report.outcome, 'failed'); assert.equal(report.checks.length, 4); assert.equal(validateReport(report, curriculum).ok, true);
  });
});
test('complete solution writes a valid unique report and leaves source intact', async () => fixture(correct, async root => {
  const sourceFile = join(root, exercise.workspacePath, 'solution.mjs');
  const first = await runExercise(exercise.id, { root, curriculum }); const second = await runExercise(exercise.id, { root, curriculum });
  assert.equal(first.report.outcome, 'passed'); assert.notEqual(first.report.runId, second.report.runId); assert.equal(validateReport(first.report, curriculum).ok, true);
  assert.deepEqual(JSON.parse(await readFile(first.reportPath, 'utf8')), first.report); assert.equal(await readFile(sourceFile, 'utf8'), correct);
  assert.equal((await readdir(join(root, 'practice/reports'))).length, 2);
}));
test('syntax errors and missing runner are errors, while unfinished process is interrupted', async () => {
  await fixture('export const = ;', async root => { const { report } = await runExercise(exercise.id, { root, curriculum }); assert.equal(report.outcome, 'error'); assert.equal(report.checks.length, 0); });
  await fixture(correct, async root => { const { report } = await runExercise(exercise.id, { root, curriculum, executable: join(root, 'missing-node') }); assert.equal(report.outcome, 'error'); });
  await fixture('while(true){}', async root => { const { report } = await runExercise(exercise.id, { root, curriculum, timeoutMs: 200 }); assert.equal(report.outcome, 'interrupted'); });
  await fixture('process.exit(0)', async root => { const { report } = await runExercise(exercise.id, { root, curriculum }); assert.equal(report.outcome, 'interrupted'); });
});
test('unknown exercise and tampered registry cannot launch commands', async () => fixture(correct, async root => {
  await assert.rejects(runExercise('unknown;echo unsafe', { root, curriculum }), /упражнение/);
  const invalid = structuredClone(curriculum); invalid.exercises[0].targetKey = 'echo unsafe';
  await assert.rejects(runExercise(exercise.id, { root, curriculum: invalid }), /targetKey/);
}));
test('author verification uses separate copy and never rewrites pupil source', async () => {
  const root = resolve(import.meta.dirname, '..'), file = join(root, exercise.workspacePath, 'solution.mjs');
  const before = await readFile(file, 'utf8'); const reports = await verifyAuthor({ root, curriculum });
  assert.equal(reports.length, 1); assert.equal(reports[0].outcome, 'passed'); assert.equal(await readFile(file, 'utf8'), before);
});
