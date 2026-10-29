import test from 'node:test';
import assert from 'node:assert/strict';
import * as models from '../shared/mechanisms.ts';

test('five models have two complete scenarios with valid predictions and state frames', () => {
  assert.equal(typeof models.buildMechanism, 'function');
  assert.equal(models.mechanisms.length, 5);
  for (const model of models.mechanisms) {
    assert.equal(model.variants.length, 2);
    for (const variant of model.variants) {
      const run = models.buildMechanism(model.id, variant.id);
      assert.ok(run.answers[run.correct]);
      assert.ok(run.frames.length >= 4);
      assert.ok(run.frames.every(f => f.note && f.lanes.length && f.output));
    }
  }
});
test('event loop drains nested microtasks before timer task', () => {
  assert.equal(typeof models.buildMechanism, 'function');
  const nested = models.buildMechanism('event-loop', 'nested');
  assert.deepEqual(nested.frames.at(-1).output, ['start', 'end', 'promise', 'nested', 'timer']);
  const simple = models.buildMechanism('event-loop', 'simple');
  assert.deepEqual(simple.frames.at(-1).output, ['start', 'end', 'promise', 'timer']);
});
test('search timeline exposes stale mergeMap result and cancellation with switchMap', () => {
  assert.equal(typeof models.buildMechanism, 'function');
  assert.deepEqual(models.buildMechanism('rxjs', 'switch').frames.at(-1).output, ['Результат B']);
  assert.deepEqual(models.buildMechanism('rxjs', 'merge').frames.at(-1).output, ['Результат B', 'Результат A']);
});
test('signals model distinguishes mutation from notification and lazy recomputation', () => {
  assert.equal(typeof models.buildMechanism, 'function');
  const immutable = models.buildMechanism('signals', 'replace');
  assert.match(immutable.frames[2].note, /не пересчитан/);
  assert.deepEqual(immutable.frames.at(-1).output, ['Всего: 30']);
  assert.deepEqual(models.buildMechanism('signals', 'mutate').frames.at(-1).output, ['Всего: 20']);
});
test('DI scopes and disabled form raw values are explicit', () => {
  assert.equal(typeof models.buildMechanism, 'function');
  assert.deepEqual(models.buildMechanism('di', 'root').frames.at(-1).output, ['A → S1', 'B → S1']);
  assert.deepEqual(models.buildMechanism('di', 'local').frames.at(-1).output, ['A → S1', 'B → S2']);
  assert.match(models.buildMechanism('forms', 'disabled').frames.at(-1).note, /getRawValue/);
  assert.match(models.buildMechanism('forms', 'blur').frames.at(-1).note, /blur/);
  assert.throws(() => models.buildMechanism('other', 'root'), /Неизвестный/);
});
