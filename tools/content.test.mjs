import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateCurriculum, validateReport, validateProgress, emptyProgress, mergeProgress, recommendNext, getReviewDue } from '../shared/domain.ts';
import { validateContent } from './content.mjs';

export const curriculum = () => ({ schemaVersion: 1, lessons: [
  { id: 'w1-01', week: 1, order: 1, title: 'Основы', minutes: 120, contentPath: 'content/lessons/w1-01.md', prerequisites: [], readiness: 'ready', exerciseIds: ['w1-01-ex1'] },
  { id: 'w1-02', week: 1, order: 2, title: 'Продолжение', minutes: 120, contentPath: 'content/lessons/w1-02.md', prerequisites: ['w1-01'], readiness: 'planned', exerciseIds: [] },
], exercises: [{ id: 'w1-01-ex1', lessonId: 'w1-01', assessmentRevision: 2, mode: 'automated', workspacePath: 'practice/foundations/w1-01-ex1', editablePaths: ['solution.mjs'], requiredCheckIds: ['one', 'two'], targetKey: 'foundations-w1-04' }] });
export const report = () => ({ schemaVersion: 1, runId: '00000000-0000-4000-8000-000000000001', exerciseId: 'w1-01-ex1', assessmentRevision: 2, finishedAt: '2026-10-20T12:00:00.000Z', outcome: 'passed', checks: [{ id: 'one', status: 'passed', message: 'Первое условие' }, { id: 'two', status: 'passed', message: 'Второе условие' }] });

test('valid catalogue accepts missing planned body and rejects duplicate IDs', () => {
  assert.equal(validateCurriculum(curriculum()).ok, true);
  const value = curriculum(); value.lessons.push(value.lessons[0]);
  assert.equal(validateCurriculum(value).ok, false);
});
test('unknown prerequisites and cycles cannot enter the catalogue', () => {
  const value = curriculum(); value.lessons[0].prerequisites = ['missing'];
  assert.equal(validateCurriculum(value).ok, false);
  value.lessons[0].prerequisites = ['w1-02'];
  assert.equal(validateCurriculum(value).ok, false);
});
test('invalid paths, unknown targets and empty automated checks are rejected', () => {
  for (const mutate of [v => v.lessons[0].contentPath = '../secret.md', v => v.exercises[0].targetKey = 'shell', v => v.exercises[0].requiredCheckIds = [], v => v.exercises[0].editablePaths = ['../secret']]) {
    const value = curriculum(); mutate(value); assert.equal(validateCurriculum(value).ok, false);
  }
});
test('unknown schema and malformed shapes return errors without throwing', () => {
  for (const value of [null, [], {}, { schemaVersion: 99 }, { schemaVersion: 1, lessons: [null], exercises: [null] }]) assert.equal(validateCurriculum(value).ok, false);
});
test('only complete applicable checks establish a pass', () => {
  assert.equal(validateReport(report(), curriculum()).ok, true);
  for (const mutate of [v => v.checks = [], v => v.checks.pop(), v => v.checks[0].status = 'skipped', v => v.checks[0].status = 'failed', v => v.exerciseId = 'unknown', v => v.assessmentRevision = 1, v => v.schemaVersion = 2, v => v.runId = 'not-uuid', v => v.finishedAt = 'yesterday', v => v.checks.push({ ...v.checks[0] }), v => v.checks.push({ id: 'unknown', status: 'passed', message: 'unknown' })]) {
    const value = report(); mutate(value); assert.equal(validateReport(value, curriculum()).ok, false);
  }
});
test('errors and interruptions can record incomplete checks without awarding success', () => {
  for (const outcome of ['error', 'interrupted', 'failed']) { const value = report(); value.outcome = outcome; value.checks = []; assert.equal(validateReport(value, curriculum()).ok, true); }
});
test('progress keeps old revisions historical and rejects future revisions or invalid records', () => {
  const value = emptyProgress(); value.attempts.push(report()); value.attempts[0].assessmentRevision = 1;
  assert.equal(validateProgress(value, curriculum()).ok, true);
  value.attempts[0].assessmentRevision = 3; assert.equal(validateProgress(value, curriculum()).ok, false);
  assert.equal(validateProgress({ ...emptyProgress(), lessonRecords: { 'unknown': {} } }, curriculum()).ok, false);
  assert.equal(validateProgress({ ...emptyProgress(), lessonRecords: { 'w1-01': { masteredAt: 'bad' } } }, curriculum()).ok, false);
});
test('merge deduplicates attempts and preserves unrelated records without mutating inputs', () => {
  const local = emptyProgress(); local.lessonRecords['w1-01'] = { readAt: '2026-10-20T10:00:00Z' }; local.attempts.push(report());
  const incoming = emptyProgress(); incoming.lessonRecords['w1-02'] = { startedAt: '2026-10-20T11:00:00Z' }; incoming.attempts.push(report());
  const result = mergeProgress(local, incoming);
  assert.equal(Object.keys(result.snapshot.lessonRecords).length, 2); assert.equal(result.snapshot.attempts.length, 1); assert.equal(result.conflicts.length, 0);
  assert.equal(local.lessonRecords['w1-02'], undefined);
});
test('conflicting manual records remain local and conflicting attempt IDs are rejected', () => {
  const local = emptyProgress(), incoming = emptyProgress();
  local.lessonRecords['w1-01'] = { practiceMode: 'independent' }; incoming.lessonRecords['w1-01'] = { practiceMode: 'guided' };
  const result = mergeProgress(local, incoming); assert.equal(result.conflicts.length, 1); assert.equal(result.snapshot.lessonRecords['w1-01'].practiceMode, 'independent');
  local.attempts.push(report()); incoming.attempts.push({ ...report(), outcome: 'failed' }); assert.throws(() => mergeProgress(local, incoming), /runId/);
});
test('explicit cleared mastery survives stale backup import as a visible conflict', () => {
  const local = emptyProgress(), incoming = emptyProgress();
  local.lessonRecords['w1-01'] = { masteredAt: null }; incoming.lessonRecords['w1-01'] = { masteredAt: '2026-10-01T12:00:00Z' };
  assert.equal(validateProgress(local, curriculum()).ok, true);
  const preview = mergeProgress(local, incoming);
  assert.equal(preview.snapshot.lessonRecords['w1-01'].masteredAt, null); assert.equal(preview.conflicts.length, 1);
  assert.equal(recommendNext(curriculum(), local)?.id, 'w1-01');
});
test('recommendation resumes started lesson then chooses ready eligible content', () => {
  const value = curriculum(), progress = emptyProgress(); assert.equal(recommendNext(value, progress)?.id, 'w1-01');
  value.lessons[1].readiness = 'ready'; progress.lessonRecords['w1-02'] = { startedAt: '2026-10-20T11:00:00Z' };
  assert.equal(recommendNext(value, progress)?.id, 'w1-02');
  progress.lessonRecords['w1-01'] = { masteredAt: '2026-10-20T12:00:00Z' }; progress.lessonRecords['w1-02'].masteredAt = '2026-10-20T12:00:00Z';
  assert.equal(recommendNext(value, progress), null); value.lessons.forEach(l => l.readiness = 'planned'); assert.equal(recommendNext(value, emptyProgress()), null);
});
test('failed recall returns an already mastered lesson to the next session', () => {
  const value = curriculum(), progress = emptyProgress();
  value.lessons[1].readiness = 'ready';
  progress.lessonRecords['w1-01'] = { masteredAt: '2026-10-01T12:00:00Z', reviews: [{ at: '2026-10-03T12:00:00Z', result: 'repeat' }] };
  assert.equal(recommendNext(value, progress)?.id, 'w1-01');
});
test('reviews follow 2 and 7 day milestones and repeat is immediate', () => {
  const value = curriculum(), progress = emptyProgress(); progress.lessonRecords['w1-01'] = { masteredAt: '2026-10-01T12:00:00Z' };
  assert.equal(getReviewDue(value, progress, new Date('2026-10-02T12:00:00Z')).length, 0);
  assert.equal(getReviewDue(value, progress, new Date('2026-10-03T12:00:00Z')).length, 1);
  progress.lessonRecords['w1-01'].reviews = [{ at: '2026-10-03T12:00:00Z', result: 'remembered' }];
  assert.equal(getReviewDue(value, progress, new Date('2026-10-07T12:00:00Z')).length, 0);
  assert.equal(getReviewDue(value, progress, new Date('2026-10-08T12:00:00Z')).length, 1);
  progress.lessonRecords['w1-01'].reviews.push({ at: '2026-10-08T12:00:00Z', result: 'remembered' });
  assert.equal(getReviewDue(value, progress, new Date('2026-10-20T12:00:00Z')).length, 0);
  progress.lessonRecords['w1-01'].reviews.push({ at: '2026-10-20T12:00:00Z', result: 'repeat' });
  assert.equal(getReviewDue(value, progress, new Date('2026-10-20T12:00:00Z')).length, 1);
});
test('content validates ready files and links while allowing future lesson bodies', async () => {
  const root = await mkdtemp(join(tmpdir(), 'learning-content-'));
  try {
    const value = curriculum(); await mkdir(join(root, 'content/lessons'), { recursive: true }); await mkdir(join(root, value.exercises[0].workspacePath), { recursive: true }); await writeFile(join(root, value.exercises[0].workspacePath, 'solution.mjs'), '');
    assert.equal((await validateContent(value, root)).ok, false);
    await writeFile(join(root, value.lessons[0].contentPath), '# Урок\n[будущее](w1-02.md)'); assert.equal((await validateContent(value, root)).ok, true);
    await writeFile(join(root, value.lessons[0].contentPath), '# Урок\n[потеряно](missing.md)'); assert.equal((await validateContent(value, root)).ok, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('manual practice needs an explicit rubric and actual editable files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'learning-rubric-'));
  try {
    const value = curriculum(); value.exercises[0].mode = 'manual'; value.exercises[0].requiredCheckIds = []; delete value.exercises[0].targetKey;
    await mkdir(join(root, 'content/lessons'), { recursive: true }); await mkdir(join(root, value.exercises[0].workspacePath), { recursive: true });
    await writeFile(join(root, value.lessons[0].contentPath), '# Практика\n## Рубрика самопроверки\nПроверьте результат.');
    assert.equal((await validateContent(value, root)).ok, false);
    await writeFile(join(root, value.exercises[0].workspacePath, 'solution.mjs'), ''); assert.equal((await validateContent(value, root)).ok, true);
    await writeFile(join(root, value.lessons[0].contentPath), '# Практика\nПросто отметьте успех.'); assert.equal((await validateContent(value, root)).ok, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
