import test from 'node:test';
import assert from 'node:assert/strict';
import * as state from '../shared/training.ts';

const items = [
  { id: 'review-01', kind: 'review', title: 'Ревью', lessonId: 'w1-01', minutes: 20, concept: 'references', summary: 'Пример', placement: 'optional', brief: 'Контекст', acceptance: ['Проверить'], hints: ['1', '2', '3'], explanation: 'Причина', relatedIds: ['review-02'], diff: '+x', verdict: 'changes', findings: ['Ошибка'] },
  { id: 'review-02', kind: 'review', title: 'Другой пример', lessonId: 'w1-01', minutes: 20, concept: 'references', summary: 'Перенос', placement: 'optional', brief: 'Контекст', acceptance: ['Проверить'], hints: ['1', '2', '3'], explanation: 'Причина', relatedIds: ['review-01'], diff: '+x', verdict: 'accept', findings: ['Корректно'] },
];
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const mistake = () => ({ id: id(1), itemId: 'review-01', createdAt: '2026-10-01T10:00:00Z', symptom: 'Список не обновился', hypothesis: 'Думал, что push уведомит computed', explanation: 'Нужна новая ссылка при стандартном сравнении', nextId: 'review-02' });

test('training catalogue rejects broken links, duplicate IDs and incomplete reviews', () => {
  assert.equal(typeof state.validateTraining, 'function');
  assert.equal(state.validateTraining(items, ['w1-01']).ok, true);
  const correctReview = structuredClone(items); correctReview[1].findings = [];
  assert.equal(state.validateTraining(correctReview, ['w1-01']).ok, true);
  for (const change of [v => v.push(v[0]), v => v[0].lessonId = 'missing', v => v[0].relatedIds = ['missing'], v => v[0].verdict = 'maybe', v => v[0].workspacePath = '../outside', v => v[0].hints = []]) {
    const value = structuredClone(items); change(value);
    assert.equal(state.validateTraining(value, ['w1-01']).ok, false);
  }
});
test('journal boundaries reject malformed data, duplicate conflicts and orphan recalls', () => {
  assert.equal(typeof state.validateTrainingProgress, 'function');
  const valid = { ...state.emptyTrainingProgress(), mistakes: [mistake()] };
  assert.equal(state.validateTrainingProgress(valid, items).ok, true);
  for (const change of [v => v.mistakes[0].nextId = 'missing', v => v.mistakes[0].createdAt = 'yesterday', v => v.mistakes[0].symptom = '', v => v.mistakes[0].itemId = 'unknown', v => v.mistakes[0].nextId = 'review-01', v => v.mistakes[0].nextId = ['review-01'], v => v.mistakes[0].itemId = ['review-01'], v => v.attempts.push({ id: id(2), itemId: ['review-01'], at: '2026-10-03T10:00:00Z', answer: 'Ответ на упражнение', decision: ['accept'] }), v => v.mistakes.push({ ...v.mistakes[0], symptom: 'other' }), v => v.recalls.push({ id: id(5), mistakeId: id(9), at: '2026-10-03T10:00:00Z', result: 'remembered', response: 'Самостоятельный ответ' })]) {
    const value = structuredClone(valid); change(value);
    assert.equal(state.validateTrainingProgress(value, items).ok, false);
  }
});
test('journal merge is idempotent, preserves independent work and refuses silent overwrite', () => {
  assert.equal(typeof state.mergeTrainingProgress, 'function');
  const local = { ...state.emptyTrainingProgress(), mistakes: [mistake()] };
  const incoming = { ...state.emptyTrainingProgress(), attempts: [{ id: id(2), itemId: 'review-02', at: '2026-10-02T10:00:00Z', answer: 'Проверил поведение на пустом массиве', decision: 'accept' }] };
  const merged = state.mergeTrainingProgress(local, incoming);
  assert.equal(merged.mistakes.length, 1);
  assert.equal(merged.attempts.length, 1);
  assert.deepEqual(state.mergeTrainingProgress(merged, incoming), merged);
  assert.equal(local.attempts.length, 0);
  assert.throws(() => state.mergeTrainingProgress(local, { ...local, mistakes: [{ ...mistake(), hypothesis: 'Другой ответ' }] }), /Конфликт/);
});
test('mistake recalls are due at two and seven days, never completed by a grader', () => {
  assert.equal(typeof state.mistakeSchedule, 'function');
  const progress = { ...state.emptyTrainingProgress(), mistakes: [mistake()] };
  const schedule = day => state.mistakeSchedule(mistake(), progress.recalls, new Date(`2026-10-${String(day).padStart(2, '0')}T10:00:00Z`));
  assert.equal(schedule(2).due, false);
  assert.equal(schedule(3).due, true);
  progress.recalls.push({ id: id(3), mistakeId: id(1), at: '2026-10-03T10:00:00Z', result: 'remembered', response: 'Проверил на другом примере' });
  assert.equal(schedule(4).due, false);
  assert.equal(schedule(8).due, true);
  progress.recalls.push({ id: id(4), mistakeId: id(1), at: '2026-10-08T10:00:00Z', result: 'remembered', response: 'Объяснил без подсказок' });
  assert.equal(schedule(9).complete, true);
  progress.recalls.push({ id: id(5), mistakeId: id(1), at: '2026-10-09T10:00:00Z', result: 'repeat', response: 'Снова перепутал ссылку и копию' });
  assert.equal(schedule(9).complete, false);
  assert.equal(schedule(9).due, true);
});
test('future imported recalls do not complete a repetition before their date', () => {
  const recall = { id: id(3), mistakeId: id(1), at: '2026-10-08T10:00:00Z', result: 'remembered', response: 'Ответ с другого устройства' };
  assert.deepEqual(state.mistakeSchedule(mistake(), [recall], new Date('2026-10-03T10:00:00Z')), { due: true, complete: false, nextAt: '2026-10-03T10:00:00.000Z' });
});
test('a late first recall cannot count as both spaced sessions', () => {
  const recall = { id: id(3), mistakeId: id(1), at: '2026-10-08T10:00:00Z', result: 'remembered', response: 'Первое самостоятельное повторение' };
  assert.deepEqual(state.mistakeSchedule(mistake(), [recall], new Date('2026-10-08T10:00:00Z')), { due: false, complete: false, nextAt: '2026-10-13T10:00:00.000Z' });
});
